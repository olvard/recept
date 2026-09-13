import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { RequestOptions } from "node:http";
import { RecipeImportError } from "./errors";
import { defaultRobotsCheck, type RobotsCheck } from "./robots";
import { validateUrl, defaultDnsResolver, type ValidatedUrl } from "./url-policy";
import type { DnsResolver, HttpRequestExecutor, HttpResponse } from "./types";
import {
  FETCH_PER_HOP_TIMEOUT_MS,
  FETCH_TOTAL_TIMEOUT_MS,
  MAX_HTML_BYTES,
  MAX_REDIRECTS,
} from "./types";

export type SafeFetchResult = {
  html: string;
  finalUrl: string;
  bytes: number;
  redirects: number;
  statusCode: number;
};

export type SafeFetchOptions = {
  resolve?: DnsResolver;
  request?: HttpRequestExecutor;
  robots?: RobotsCheck | null;
  userAgent?: string;
  deadlineAt?: number;
  now?: () => number;
};

const REQUEST_HEADERS = {
  "User-Agent": "ReceptRecipeImporter/0.1",
  Accept: "text/html, application/xhtml+xml",
  "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
  "Accept-Encoding": "identity",
};

function normalizeHeaders(headers: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value[0] : value]));
}

function responseHeaders(response: HttpResponse) {
  return normalizeHeaders(response.headers);
}

function abortError() {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}

export const nodeHttpRequest: HttpRequestExecutor = (url, address, signal) => new Promise((resolve, reject) => {
  const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
  const requestOptions: RequestOptions = {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || undefined,
    path: `${url.pathname || "/"}${url.search}`,
    method: "GET",
    headers: { ...REQUEST_HEADERS, "User-Agent": process.env.RECIPE_IMPORT_USER_AGENT ?? REQUEST_HEADERS["User-Agent"] },
    agent: false,
    signal,
    lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    ...(url.protocol === "https:" ? { servername: url.hostname } : {}),
  };
  let settled = false;
  const request = transport(requestOptions, (response) => {
    settled = true;
    resolve({
      statusCode: response.statusCode ?? 0,
      headers: normalizeHeaders(response.headers),
      body: response,
      abort: () => response.destroy(),
    });
  });
  request.once("error", (error) => {
    if (!settled) reject(error);
  });
  request.end();
});

async function readBounded(response: HttpResponse, signal: AbortSignal) {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of response.body) {
    if (signal.aborted) throw abortError();
    length += chunk.byteLength;
    if (length > MAX_HTML_BYTES) {
      response.abort?.();
      throw new RecipeImportError("FETCHED_BODY_TOO_LARGE");
    }
    chunks.push(chunk);
  }
  return { body: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))), bytes: length };
}

function contentType(response: HttpResponse) {
  return responseHeaders(response)["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
}

function contentLength(response: HttpResponse) {
  const value = responseHeaders(response)["content-length"];
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function remaining(deadlineAt: number, now: () => number) {
  const value = deadlineAt - now();
  if (value <= 0) throw new RecipeImportError("FETCH_TIMEOUT");
  return value;
}

export async function safeFetchHtml(input: string | URL, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const resolve = options.resolve ?? defaultDnsResolver;
  const request = options.request ?? nodeHttpRequest;
  const robots = options.robots === undefined ? defaultRobotsCheck : options.robots;
  const userAgent = options.userAgent ?? process.env.RECIPE_IMPORT_USER_AGENT ?? REQUEST_HEADERS["User-Agent"];
  const now = options.now ?? Date.now;
  const deadlineAt = options.deadlineAt ?? now() + FETCH_TOTAL_TIMEOUT_MS;
  let validated: ValidatedUrl = await validateUrl(input, { resolve, timeoutMs: remaining(deadlineAt, now) });
  let redirects = 0;

  while (true) {
    const hopMs = Math.min(FETCH_PER_HOP_TIMEOUT_MS, remaining(deadlineAt, now));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), hopMs);
    try {
      if (robots && !(await robots(validated.url, { resolve, request, userAgent, signal: controller.signal }))) {
        throw new RecipeImportError("ROBOTS_DISALLOWED");
      }

      let response: HttpResponse;
      try {
        response = await request(validated.url, validated.address, controller.signal);
      } catch (error) {
        if (controller.signal.aborted) throw new RecipeImportError("FETCH_TIMEOUT", { cause: error });
        throw new RecipeImportError("FETCH_FAILED", { cause: error });
      }

      if (response.statusCode >= 300 && response.statusCode < 400) {
        const location = responseHeaders(response).location;
        response.abort?.();
        if (!location) throw new RecipeImportError("FETCH_FAILED");
        if (redirects >= MAX_REDIRECTS) throw new RecipeImportError("URL_NOT_ALLOWED");
        let redirectUrl: URL;
        try {
          redirectUrl = new URL(location, validated.url);
        } catch {
          throw new RecipeImportError("URL_NOT_ALLOWED");
        }
        validated = await validateUrl(redirectUrl, { resolve, timeoutMs: remaining(deadlineAt, now) });
        redirects += 1;
        continue;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.abort?.();
        throw new RecipeImportError("FETCH_FAILED");
      }
      const type = contentType(response);
      if (type !== "text/html" && type !== "application/xhtml+xml") {
        response.abort?.();
        throw new RecipeImportError("UNSUPPORTED_CONTENT_TYPE");
      }
      if ((contentLength(response) ?? 0) > MAX_HTML_BYTES) {
        response.abort?.();
        throw new RecipeImportError("FETCHED_BODY_TOO_LARGE");
      }
      const body = await readBounded(response, controller.signal);
      return { html: new TextDecoder().decode(body.body), finalUrl: validated.url.href, bytes: body.bytes, redirects, statusCode: response.statusCode };
    } catch (error) {
      if (error instanceof RecipeImportError) throw error;
      if (controller.signal.aborted) throw new RecipeImportError("FETCH_TIMEOUT", { cause: error });
      throw new RecipeImportError("FETCH_FAILED", { cause: error });
    } finally {
      clearTimeout(timer);
    }
  }
}

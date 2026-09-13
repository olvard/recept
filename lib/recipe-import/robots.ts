import robotsParser from "robots-parser";
import { RecipeImportError } from "./errors";
import { validateUrl, type ValidatedUrl } from "./url-policy";
import type { DnsResolver, HttpRequestExecutor } from "./types";
import { MAX_ROBOTS_BYTES, ROBOTS_TIMEOUT_MS } from "./types";

export type RobotsCheck = (
  url: URL,
  options: {
    resolve: DnsResolver;
    request: HttpRequestExecutor;
    userAgent: string;
    signal: AbortSignal;
  },
) => Promise<boolean>;

async function readRobotsBody(body: AsyncIterable<Uint8Array>, signal: AbortSignal) {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of body) {
    if (signal.aborted) throw new Error("aborted");
    length += chunk.byteLength;
    if (length > MAX_ROBOTS_BYTES) return null;
    chunks.push(chunk);
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

export const defaultRobotsCheck: RobotsCheck = async (url, options) => {
  const robotsUrl = new URL("/robots.txt", url.origin);
  let validated: ValidatedUrl;
  try {
    validated = await validateUrl(robotsUrl, { resolve: options.resolve, timeoutMs: ROBOTS_TIMEOUT_MS });
  } catch {
    return true;
  }

  const controller = new AbortController();
  const abortParent = () => controller.abort();
  const timer = setTimeout(() => controller.abort(), ROBOTS_TIMEOUT_MS);
  if (options.signal.aborted) controller.abort();
  options.signal.addEventListener("abort", abortParent, { once: true });
  try {
    const response = await options.request(validated.url, validated.address, controller.signal);
    if (response.statusCode === 404 || response.statusCode >= 400) {
      response.abort?.();
      return true;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      response.abort?.();
      return true;
    }
    const body = await readRobotsBody(response.body, controller.signal);
    if (body === null) return true;
    const policy = robotsParser(validated.url.href, body);
    return policy.isAllowed(url.href, options.userAgent) !== false;
  } catch (error) {
    if (error instanceof RecipeImportError) throw error;
    return true;
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener("abort", abortParent);
  }
};

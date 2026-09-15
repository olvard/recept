import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { RecipeImportError } from "./errors";
import type { DnsResolver, ResolvedAddress } from "./types";
import { MAX_URL_LENGTH } from "./types";

const METADATA_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.google.internal.",
  "metadata.amazonaws.com",
  "instance-data.ec2.internal",
]);

export type ValidatedUrl = {
  url: URL;
  hostname: string;
  addresses: ResolvedAddress[];
  address: ResolvedAddress;
};

export const defaultDnsResolver: DnsResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records
    .filter((record): record is typeof record & { family: 4 | 6 } => record.family === 4 || record.family === 6)
    .map((record) => ({ address: record.address, family: record.family }));
};

function reject(code: "INVALID_REQUEST" | "URL_NOT_ALLOWED"): never {
  throw new RecipeImportError(code);
}

function hostForIpParsing(hostname: string) {
  return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

export function isUnsafeAddress(address: string) {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() !== "unicast";
  } catch {
    return true;
  }
}

function validateSyntax(value: string): URL {
  if (!value.trim() || value.length > MAX_URL_LENGTH) reject("INVALID_REQUEST");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    reject("INVALID_REQUEST");
  }

  if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password || url.hash || !url.hostname) {
    reject("URL_NOT_ALLOWED");
  }
  if ((url.protocol === "http:" && url.port && url.port !== "80") || (url.protocol === "https:" && url.port && url.port !== "443")) {
    reject("URL_NOT_ALLOWED");
  }
  if (ipaddr.isValid(hostForIpParsing(url.hostname))) reject("URL_NOT_ALLOWED");
  return url;
}

function metadataHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return METADATA_HOSTNAMES.has(normalized) || normalized.endsWith(".metadata.google.internal");
}

export async function validateUrl(
  value: string | URL,
  options: { resolve?: DnsResolver; timeoutMs?: number } = {},
): Promise<ValidatedUrl> {
  const url = typeof value === "string" ? validateSyntax(value) : validateSyntax(value.href);
  const hostname = url.hostname.toLowerCase();
  if (metadataHostname(hostname)) reject("URL_NOT_ALLOWED");

  const resolver = options.resolve ?? defaultDnsResolver;
  let addresses: ResolvedAddress[];
  try {
    const resolution = resolver(hostname);
    addresses = options.timeoutMs ? await withTimeout(resolution, options.timeoutMs) : await resolution;
  } catch {
    reject("URL_NOT_ALLOWED");
  }
  if (!addresses.length || addresses.some((address) => isUnsafeAddress(address.address))) reject("URL_NOT_ALLOWED");

  return { url, hostname, addresses, address: addresses[0] };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error("timeout")), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolvePromise(value); },
      (error) => { clearTimeout(timer); rejectPromise(error); },
    );
  });
}

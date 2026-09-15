import { createHash, randomUUID } from "node:crypto";
import { createOpenAiExtractor } from "./openai-extractor";
import { RecipeImportError, asRecipeImportError } from "./errors";
import { mergeDeterministicExtractions, mergeLlmExtraction } from "./normalize";
import { parseHtml } from "./parse-html";
import { parseJsonLd } from "./parse-jsonld";
import { safeFetchHtml, type SafeFetchOptions, type SafeFetchResult } from "./safe-fetch";
import { LLM_ALLOWED_CATEGORY_SLUGS } from "./schema";
import type {
  DnsResolver,
  HttpRequestExecutor,
  ImportLogger,
  LlmExtractor,
  RecipeImportResponse,
} from "./types";
import { IMPORT_TOTAL_DEADLINE_MS } from "./types";

export type RecipeImportDependencies = {
  fetchHtml?: (url: string, options?: SafeFetchOptions) => Promise<SafeFetchResult>;
  resolve?: DnsResolver;
  request?: HttpRequestExecutor;
  robots?: SafeFetchOptions["robots"];
  llm?: LlmExtractor;
  now?: () => number;
  logger?: ImportLogger;
  requestId?: string;
};

const defaultLogger: ImportLogger = (event, fields) => {
  console.info(JSON.stringify({ event, ...fields }));
};

function urlLogFields(value: string) {
  try {
    const url = new URL(value);
    const redacted = new URL(url.origin);
    redacted.pathname = "/";
    return { hostname: url.hostname, urlHash: createHash("sha256").update(url.href).digest("hex"), path: redacted.pathname };
  } catch {
    return { hostname: null, urlHash: null, path: null };
  }
}

function requiredFields(result: RecipeImportResponse["result"]) {
  return [
    !result.title ? "title" : null,
    !result.ingredients.length ? "ingredients" : null,
    !result.instructions.length ? "instructions" : null,
  ].filter((field): field is string => field !== null);
}

function llmFields(result: RecipeImportResponse["result"]) {
  return [
    ...requiredFields(result),
    result.prepMinutes === null ? "prepMinutes" : null,
  ].filter((field): field is string => field !== null);
}

async function runLlmWithDeadline(extractor: LlmExtractor, payload: Parameters<LlmExtractor>[0], deadlineAt: number, now: () => number) {
  const timeoutMs = deadlineAt - now();
  if (timeoutMs <= 0) throw new RecipeImportError("LLM_TIMEOUT");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => reject(new RecipeImportError("LLM_TIMEOUT")), timeoutMs);
  });
  try {
    const result = await Promise.race([
      extractor(payload, controller.signal),
      timeoutPromise,
    ]);
    return result;
  } catch (error) {
    if (error instanceof RecipeImportError) throw error;
    if (controller.signal.aborted) throw new RecipeImportError("LLM_TIMEOUT", { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
  }
}

export async function importRecipeFromUrl(url: string, dependencies: RecipeImportDependencies = {}): Promise<RecipeImportResponse> {
  const requestId = dependencies.requestId ?? randomUUID();
  const logger = dependencies.logger ?? defaultLogger;
  const now = dependencies.now ?? Date.now;
  const startedAt = now();
  const deadlineAt = startedAt + IMPORT_TOTAL_DEADLINE_MS;
  const logUrl = urlLogFields(url);
  logger("recipe_import.request", { requestId, ...logUrl });

  try {
    const fetcher = dependencies.fetchHtml ?? safeFetchHtml;
    logger("recipe_import.fetch_started", { requestId, ...logUrl });
    const fetched = await fetcher(url, {
      resolve: dependencies.resolve,
      request: dependencies.request,
      robots: dependencies.robots,
      deadlineAt,
      now,
    });
    const finalUrlFields = urlLogFields(fetched.finalUrl);
    logger("recipe_import.url_validated", { requestId, ...finalUrlFields });
    logger("recipe_import.fetch_completed", { requestId, bytes: fetched.bytes, redirects: fetched.redirects, status: fetched.statusCode, durationMs: now() - startedAt });

    const jsonld = parseJsonLd(fetched.html, fetched.finalUrl);
    const html = parseHtml(fetched.html, fetched.finalUrl);
    logger("recipe_import.jsonld_parsed", {
      requestId,
      jsonldSources: jsonld.sourceCounts.jsonld ?? 0,
      htmlSources: html.sourceCounts.html ?? 0,
      microdataSources: html.sourceCounts.microdata ?? 0,
    });

    let merged = mergeDeterministicExtractions(jsonld, html, fetched.finalUrl);
    const unresolvedFields = llmFields(merged.result);
    if (unresolvedFields.length) {
      const extractor = dependencies.llm ?? createOpenAiExtractor();
      const payload = {
        sourceUrl: fetched.finalUrl,
        structuredRecipeData: jsonld.structuredRecipeData,
        recipeText: html.visibleText.slice(0, 20_000),
        unresolvedFields,
        allowedCategorySlugs: [...LLM_ALLOWED_CATEGORY_SLUGS],
      };
      logger("recipe_import.llm_started", { requestId, fields: unresolvedFields.join(",") });
      const llm = await runLlmWithDeadline(extractor, payload, deadlineAt, now);
      logger("recipe_import.llm_completed", { requestId, durationMs: now() - startedAt });
      merged = mergeLlmExtraction(merged, llm);
    }

    const remaining = requiredFields(merged.result);
    if (remaining.length) {
      throw new RecipeImportError("EXTRACTION_INCOMPLETE", { warnings: merged.warnings });
    }

    const response: RecipeImportResponse = {
      status: "needs_review",
      result: merged.result,
      provenance: merged.provenance,
      warnings: merged.warnings,
    };
    logger("recipe_import.completed", { requestId, durationMs: now() - startedAt, llmUsed: unresolvedFields.length > 0 });
    return response;
  } catch (error) {
    const importError = asRecipeImportError(error);
    logger("recipe_import.failed", { requestId, code: importError.code, retryable: importError.retryable, durationMs: now() - startedAt });
    throw importError;
  }
}

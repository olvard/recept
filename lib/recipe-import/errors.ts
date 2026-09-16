import type { ImportWarning, RecipeImportErrorCode } from "./types";

const ERROR_MESSAGES: Record<RecipeImportErrorCode, string> = {
  INVALID_REQUEST: "Begäran kunde inte läsas.",
  ORIGIN_NOT_ALLOWED: "Begärans ursprung är inte tillåtet.",
  REQUEST_TOO_LARGE: "Begäran är för stor.",
  FETCHED_BODY_TOO_LARGE: "Källsidan är för stor.",
  UNSUPPORTED_CONTENT_TYPE: "Källan är inte en HTML-sida.",
  URL_NOT_ALLOWED: "Källan är inte tillåten.",
  ROBOTS_DISALLOWED: "Källan tillåter inte denna hämtning.",
  EXTRACTION_INCOMPLETE: "Receptet innehåller inte tillräckligt med information.",
  FETCH_FAILED: "Källsidan kunde inte hämtas.",
  LLM_PROVIDER_ERROR: "Recepttolkningen kunde inte slutföras.",
  LLM_NOT_CONFIGURED: "Automatisk komplettering är inte konfigurerad.",
  FETCH_TIMEOUT: "Källsidan tog för lång tid att hämta.",
  LLM_TIMEOUT: "Automatisk komplettering tog för lång tid.",
  INTERNAL_ERROR: "Något gick fel.",
};

const ERROR_STATUSES: Record<RecipeImportErrorCode, number> = {
  INVALID_REQUEST: 400,
  ORIGIN_NOT_ALLOWED: 403,
  REQUEST_TOO_LARGE: 413,
  FETCHED_BODY_TOO_LARGE: 413,
  UNSUPPORTED_CONTENT_TYPE: 415,
  URL_NOT_ALLOWED: 422,
  ROBOTS_DISALLOWED: 422,
  EXTRACTION_INCOMPLETE: 422,
  FETCH_FAILED: 502,
  LLM_PROVIDER_ERROR: 502,
  LLM_NOT_CONFIGURED: 503,
  FETCH_TIMEOUT: 504,
  LLM_TIMEOUT: 504,
  INTERNAL_ERROR: 500,
};

const RETRYABLE_CODES = new Set<RecipeImportErrorCode>([
  "FETCH_FAILED",
  "LLM_PROVIDER_ERROR",
  "LLM_TIMEOUT",
  "FETCH_TIMEOUT",
  "INTERNAL_ERROR",
]);

export class RecipeImportError extends Error {
  readonly code: RecipeImportErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly warnings?: ImportWarning[];

  constructor(code: RecipeImportErrorCode, options?: { cause?: unknown; message?: string; retryable?: boolean; warnings?: ImportWarning[] }) {
    super(options?.message ?? ERROR_MESSAGES[code], { cause: options?.cause });
    this.name = "RecipeImportError";
    this.code = code;
    this.status = ERROR_STATUSES[code];
    this.retryable = options?.retryable ?? RETRYABLE_CODES.has(code);
    this.warnings = options?.warnings;
  }
}

export function asRecipeImportError(error: unknown): RecipeImportError {
  if (error instanceof RecipeImportError) return error;
  return new RecipeImportError("INTERNAL_ERROR", { cause: error });
}

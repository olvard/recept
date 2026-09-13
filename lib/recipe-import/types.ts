export const MAX_REQUEST_BODY_BYTES = 8_192;
export const MAX_URL_LENGTH = 2_048;
export const MAX_REDIRECTS = 3;
export const MAX_HTML_BYTES = 2 * 1024 * 1024;
export const MAX_VISIBLE_TEXT_CHARS = 20_000;
export const MAX_JSONLD_CHARS = 30_000;
export const MAX_ROBOTS_BYTES = 256 * 1024;
export const FETCH_PER_HOP_TIMEOUT_MS = 8_000;
export const FETCH_TOTAL_TIMEOUT_MS = 15_000;
export const ROBOTS_TIMEOUT_MS = 2_000;
export const LLM_TIMEOUT_MS = 15_000;
export const IMPORT_TOTAL_DEADLINE_MS = 45_000;
export const LLM_MAX_OUTPUT_TOKENS = 2_000;

export const PROVENANCE_SOURCES = ["jsonld", "microdata", "html", "llm", "derived"] as const;
export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number];

export const CONFIDENCES = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export type FieldProvenance = {
  source: ProvenanceSource;
  confidence: Confidence;
  evidence: string;
};

export type ImportWarning = {
  code: string;
  field: string | null;
  message: string;
};

export type Servings = {
  value: number | null;
  rawText: string | null;
};

export type NormalizedRecipeImport = {
  title: string;
  note: string;
  categorySlugs: string[];
  categoryCandidates: string[];
  ingredients: string[];
  instructions: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  servings: Servings | null;
  sourceUrl: string;
  imageUrl: string | null;
  context: string;
};

export type RecipeImportResponse = {
  status: "needs_review";
  result: NormalizedRecipeImport;
  provenance: Partial<Record<keyof NormalizedRecipeImport, FieldProvenance>>;
  warnings: ImportWarning[];
};

export type RecipeImportErrorCode =
  | "INVALID_REQUEST"
  | "EDITOR_AUTH_REQUIRED"
  | "ORIGIN_NOT_ALLOWED"
  | "REQUEST_TOO_LARGE"
  | "FETCHED_BODY_TOO_LARGE"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "URL_NOT_ALLOWED"
  | "ROBOTS_DISALLOWED"
  | "EXTRACTION_INCOMPLETE"
  | "FETCH_FAILED"
  | "LLM_PROVIDER_ERROR"
  | "AUTH_NOT_CONFIGURED"
  | "LLM_NOT_CONFIGURED"
  | "FETCH_TIMEOUT"
  | "LLM_TIMEOUT"
  | "INTERNAL_ERROR";

export type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

export type DnsResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export type HttpResponse = {
  statusCode: number;
  headers: Record<string, string | undefined>;
  body: AsyncIterable<Uint8Array>;
  abort?: () => void;
};

export type HttpRequestExecutor = (
  url: URL,
  address: ResolvedAddress,
  signal: AbortSignal,
) => Promise<HttpResponse>;

export type ExtractionFields = {
  title: string | null;
  note: string | null;
  categoryTexts: string[];
  ingredients: string[];
  instructions: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  servings: Servings | null;
  imageUrl: string | null;
};

export type ExtractionField = keyof ExtractionFields;

export type ParsedExtraction = {
  fields: ExtractionFields;
  provenance: Partial<Record<ExtractionField, FieldProvenance>>;
  warnings: ImportWarning[];
  visibleText: string;
  structuredRecipeData: Record<string, unknown> | null;
  sourceCounts: Partial<Record<ProvenanceSource, number>>;
};

export type LlmExtraction = {
  title: string | null;
  note: string | null;
  categorySlugs: string[];
  ingredients: string[];
  instructions: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  servingsValue: number | null;
  servingsRawText: string | null;
};

export type LlmPayload = {
  sourceUrl: string;
  structuredRecipeData: Record<string, unknown> | null;
  recipeText: string;
  unresolvedFields: string[];
  allowedCategorySlugs: string[];
};

export type LlmExtractor = (payload: LlmPayload, signal?: AbortSignal) => Promise<LlmExtraction>;

export type ImportLogger = (event: string, fields: Record<string, string | number | boolean | null>) => void;

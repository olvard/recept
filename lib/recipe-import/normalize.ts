import type {
  ExtractionFields,
  FieldProvenance,
  ImportWarning,
  LlmExtraction,
  NormalizedRecipeImport,
  ParsedExtraction,
  Servings,
} from "./types";
import { mapCategories } from "./category-mapping";

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function cleanList(values: unknown[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    const text = cleanText(value);
    if (text && !result.includes(text)) result.push(text);
  }
  return result;
}

export function parseDuration(value: unknown): { minutes: number | null; invalid: boolean } {
  const text = cleanText(value);
  if (!text) return { minutes: null, invalid: false };

  const iso = text.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i);
  if (iso && (iso[1] || iso[2] || iso[3])) {
    const minutes = (Number(iso[1] ?? 0) * 24 * 60) + (Number(iso[2] ?? 0) * 60) + Number(iso[3] ?? 0);
    return { minutes: minutes > 0 ? minutes : null, invalid: minutes <= 0 };
  }

  const natural = text.match(/^(?:(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours|tim|timme|timmar)\s*)?(?:(\d+)\s*(?:m|min|mins|minute|minutes|minut|minuter))?$/i);
  if (natural && (natural[1] || natural[2])) {
    const hours = Number((natural[1] ?? "0").replace(",", "."));
    const minutes = Math.round(hours * 60) + Number(natural[2] ?? 0);
    return { minutes: minutes > 0 ? minutes : null, invalid: minutes <= 0 };
  }

  return { minutes: null, invalid: true };
}

export function parseYield(value: unknown): Servings | null {
  const rawText = cleanText(value);
  if (!rawText) return null;
  const match = rawText.match(/\d+(?:[.,]\d+)?/);
  const valueNumber = match ? Number(match[0].replace(",", ".")) : null;
  return { value: valueNumber && valueNumber > 0 ? valueNumber : null, rawText };
}

export function normalizeExternalUrl(value: unknown, baseUrl: string): string | null {
  const raw = cleanText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw, baseUrl);
    if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function chooseField<T>(
  field: keyof ExtractionFields,
  strong: ParsedExtraction,
  weak: ParsedExtraction,
  warnings: ImportWarning[],
): { value: T | null; provenance?: FieldProvenance } {
  const strongValue = strong.fields[field] as T | null;
  const weakValue = weak.fields[field] as T | null;
  const strongPresent = Array.isArray(strongValue) ? strongValue.length > 0 : strongValue !== null && strongValue !== "";
  const weakPresent = Array.isArray(weakValue) ? weakValue.length > 0 : weakValue !== null && weakValue !== "";

  if (strongPresent) {
    if (weakPresent && !valuesEqual(strongValue, weakValue)) {
      warnings.push({ code: "SOURCE_CONFLICT", field, message: "Flera källor innehåller olika värden." });
    }
    return { value: strongValue, provenance: strong.provenance[field] };
  }
  if (weakPresent) return { value: weakValue, provenance: weak.provenance[field] };
  return { value: null };
}

export function mergeDeterministicExtractions(jsonld: ParsedExtraction, html: ParsedExtraction, sourceUrl: string) {
  const warnings = [...jsonld.warnings, ...html.warnings];
  const get = <T>(field: keyof ExtractionFields) => chooseField<T>(field, jsonld, html, warnings);

  const title = get<string>("title");
  const note = get<string>("note");
  const ingredients = get<string[]>("ingredients");
  const instructions = get<string[]>("instructions");
  const prepMinutes = get<number>("prepMinutes");
  const cookMinutes = get<number>("cookMinutes");
  const totalMinutes = get<number>("totalMinutes");
  const servings = get<Servings>("servings");
  const imageUrl = get<string>("imageUrl");
  const categories = [...jsonld.fields.categoryTexts, ...html.fields.categoryTexts];
  const mappedCategories = mapCategories(categories);
  const categorySource = mapCategories(jsonld.fields.categoryTexts).categorySlugs.length ? jsonld : html;
  const provenance: Partial<Record<keyof NormalizedRecipeImport, FieldProvenance>> = {
    title: title.provenance,
    note: note.provenance,
    ingredients: ingredients.provenance,
    instructions: instructions.provenance,
    prepMinutes: prepMinutes.provenance,
    cookMinutes: cookMinutes.provenance,
    totalMinutes: totalMinutes.provenance,
    servings: servings.provenance,
    imageUrl: imageUrl.provenance,
    categorySlugs: categorySource.fields.categoryTexts.length ? categorySource.provenance.categoryTexts : undefined,
    categoryCandidates: categorySource.fields.categoryTexts.length ? categorySource.provenance.categoryTexts : undefined,
    sourceUrl: { source: "derived", confidence: "high", evidence: "validated final response URL" },
  };

  const result: NormalizedRecipeImport = {
    title: title.value ?? "",
    note: note.value ?? "",
    categorySlugs: mappedCategories.categorySlugs,
    categoryCandidates: mappedCategories.categoryCandidates,
    ingredients: ingredients.value ?? [],
    instructions: instructions.value ?? [],
    prepMinutes: prepMinutes.value,
    cookMinutes: cookMinutes.value,
    totalMinutes: totalMinutes.value,
    servings: servings.value,
    sourceUrl,
    imageUrl: imageUrl.value,
  };

  if (!result.prepMinutes) warnings.push({ code: "MISSING_PREP_TIME", field: "prepMinutes", message: "Förberedelsetid kunde inte hittas." });
  if (!result.cookMinutes) warnings.push({ code: "MISSING_COOK_TIME", field: "cookMinutes", message: "Tillagningstid kunde inte hittas." });
  if (!result.servings?.value) warnings.push({ code: "MISSING_SERVINGS", field: "servings", message: "Antal portioner kunde inte hittas." });
  if (!result.categorySlugs.length) warnings.push({ code: "CATEGORY_REVIEW_REQUIRED", field: "categorySlugs", message: "Välj en receptkategori innan receptet sparas." });
  if (result.imageUrl) warnings.push({ code: "IMAGE_URL_UNVALIDATED", field: "imageUrl", message: "Bildadressen är inte hämtad eller säkerhetskontrollerad." });

  return { result, provenance, warnings };
}

export function mergeLlmExtraction(base: ReturnType<typeof mergeDeterministicExtractions>, llm: LlmExtraction) {
  const result = { ...base.result };
  const provenance = { ...base.provenance };
  const warnings = [...base.warnings];
  const llmField = (evidence: string): FieldProvenance => ({ source: "llm", confidence: "low", evidence });

  if (!result.title && llm.title) { result.title = cleanText(llm.title); provenance.title = llmField("normalized recipe text"); }
  if (!result.note && llm.note) { result.note = cleanText(llm.note); provenance.note = llmField("normalized recipe text"); }
  if (!result.ingredients.length && llm.ingredients.length) { result.ingredients = cleanList(llm.ingredients); provenance.ingredients = llmField("normalized recipe text"); }
  if (!result.instructions.length && llm.instructions.length) { result.instructions = cleanList(llm.instructions); provenance.instructions = llmField("normalized recipe text"); }
  if (result.prepMinutes === null && llm.prepMinutes !== null) { result.prepMinutes = llm.prepMinutes; provenance.prepMinutes = llmField("normalized recipe text"); }
  if (result.cookMinutes === null && llm.cookMinutes !== null) { result.cookMinutes = llm.cookMinutes; provenance.cookMinutes = llmField("normalized recipe text"); }
  if (result.totalMinutes === null && llm.totalMinutes !== null) { result.totalMinutes = llm.totalMinutes; provenance.totalMinutes = llmField("normalized recipe text"); }
  if (!result.servings?.value && llm.servingsValue !== null) {
    result.servings = { value: llm.servingsValue, rawText: llm.servingsRawText };
    provenance.servings = llmField("normalized recipe text");
  }
  if (!result.categorySlugs.length && llm.categorySlugs.length) {
    result.categorySlugs = [...new Set(llm.categorySlugs)];
    result.categoryCandidates = [...new Set([...result.categoryCandidates, ...llm.categorySlugs])];
    provenance.categorySlugs = llmField("allowed category enum");
  }

  warnings.push({ code: "LLM_VALUE_USED", field: null, message: "Vissa värden kompletterades med automatisk tolkning." });
  if (result.categorySlugs.length) {
    const index = warnings.findIndex((warning) => warning.code === "CATEGORY_REVIEW_REQUIRED");
    if (index >= 0) warnings.splice(index, 1);
  }
  if (result.totalMinutes === null && result.prepMinutes !== null && result.cookMinutes !== null) {
    result.totalMinutes = result.prepMinutes + result.cookMinutes;
    provenance.totalMinutes = { source: "derived", confidence: "medium", evidence: "prepMinutes + cookMinutes" };
  }
  for (const [warningCode, field, present] of [
    ["MISSING_PREP_TIME", "prepMinutes", result.prepMinutes !== null],
    ["MISSING_COOK_TIME", "cookMinutes", result.cookMinutes !== null],
    ["MISSING_SERVINGS", "servings", Boolean(result.servings?.value)],
  ] as const) {
    if (present) {
      const index = warnings.findIndex((warning) => warning.code === warningCode && warning.field === field);
      if (index >= 0) warnings.splice(index, 1);
    }
  }
  return { result, provenance, warnings };
}

import * as cheerio from "cheerio";
import { MAX_JSONLD_CHARS } from "./types";
import type { ExtractionFields, FieldProvenance, ImportWarning, ParsedExtraction } from "./types";
import { cleanList, cleanText, normalizeExternalUrl, parseDuration, parseYield } from "./normalize";

const emptyFields = (): ExtractionFields => ({
  title: null,
  note: null,
  categoryTexts: [],
  ingredients: [],
  instructions: [],
  prepMinutes: null,
  cookMinutes: null,
  totalMinutes: null,
  servings: null,
  imageUrl: null,
});

function typesOf(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === "string").map((item) => item.split("/").pop()?.toLowerCase() ?? "");
}

function isRecipe(value: Record<string, unknown>) {
  return typesOf(value["@type"]).includes("recipe");
}

function collectObjects(value: unknown, result: Record<string, unknown>[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item, result);
    return;
  }
  const object = value as Record<string, unknown>;
  result.push(object);
  for (const child of Object.values(object)) collectObjects(child, result);
}

function fieldText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return cleanText(String(value));
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return fieldText(object.text ?? object.name ?? object.value);
  }
  return "";
}

function ingredientValues(value: unknown) {
  if (Array.isArray(value)) return cleanList(value.map(fieldText));
  return cleanList(fieldText(value).split(/\r?\n/));
}

function instructionValues(value: unknown): string[] {
  const values: string[] = [];
  const append = (item: unknown) => {
    if (Array.isArray(item)) {
      for (const child of item) append(child);
      return;
    }
    if (typeof item === "string" || typeof item === "number") {
      const text = cleanText(String(item));
      if (text) values.push(text);
      return;
    }
    if (!item || typeof item !== "object") return;
    const object = item as Record<string, unknown>;
    const types = typesOf(object["@type"]);
    if (types.includes("howtosection")) {
      append(object.itemListElement);
      return;
    }
    const text = fieldText(object.text ?? object.name);
    if (text) values.push(text);
    else if (object.itemListElement) append(object.itemListElement);
  };
  append(value);
  return cleanList(values);
}

function categoryValues(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return cleanList(values.flatMap((item) => fieldText(item).split(/[,;|]/)));
}

function imageValue(value: unknown, baseUrl: string) {
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    const raw = typeof item === "object" && item !== null ? (item as Record<string, unknown>).url : item;
    const normalized = normalizeExternalUrl(raw, baseUrl);
    if (normalized) return normalized;
  }
  return null;
}

function compactRecipe(recipe: Record<string, unknown>, baseUrl: string) {
  const compact: Record<string, unknown> = {};
  for (const key of ["name", "description", "recipeIngredient", "recipeInstructions", "prepTime", "cookTime", "totalTime", "recipeYield", "recipeCategory", "keywords"]) {
    const value = recipe[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string") compact[key] = value.slice(0, 4_000);
    else if (Array.isArray(value)) compact[key] = value.slice(0, 100).map((item) => typeof item === "string" ? item.slice(0, 1_000) : item);
    else compact[key] = value;
  }
  const image = imageValue(recipe.image, baseUrl);
  if (image) compact.image = image;
  return compact;
}

function candidateFromRecipe(recipe: Record<string, unknown>, baseUrl: string, warnings: ImportWarning[]): ParsedExtraction | null {
  const fields = emptyFields();
  fields.title = fieldText(recipe.name) || null;
  fields.note = fieldText(recipe.description) || null;
  fields.ingredients = ingredientValues(recipe.recipeIngredient);
  fields.instructions = instructionValues(recipe.recipeInstructions);
  fields.categoryTexts = [...categoryValues(recipe.recipeCategory), ...categoryValues(recipe.keywords)];
  fields.imageUrl = imageValue(recipe.image, baseUrl);

  const times: Array<[keyof Pick<ExtractionFields, "prepMinutes" | "cookMinutes" | "totalMinutes">, unknown]> = [
    ["prepMinutes", recipe.prepTime],
    ["cookMinutes", recipe.cookTime],
    ["totalMinutes", recipe.totalTime],
  ];
  for (const [field, rawValue] of times) {
    const parsed = parseDuration(rawValue);
    fields[field] = parsed.minutes;
    if (parsed.invalid) warnings.push({ code: "INVALID_DURATION", field, message: "En tidsangivelse kunde inte normaliseras." });
  }
  fields.servings = parseYield(recipe.recipeYield);

  if (!fields.title || (!fields.ingredients.length && !fields.instructions.length)) return null;
  const provenance: Partial<Record<keyof ExtractionFields, FieldProvenance>> = {
    title: { source: "jsonld", confidence: "high", evidence: "name" },
    note: { source: "jsonld", confidence: "high", evidence: "description" },
    ingredients: { source: "jsonld", confidence: "high", evidence: "recipeIngredient" },
    instructions: { source: "jsonld", confidence: "high", evidence: "recipeInstructions" },
    prepMinutes: { source: "jsonld", confidence: "high", evidence: "prepTime" },
    cookMinutes: { source: "jsonld", confidence: "high", evidence: "cookTime" },
    totalMinutes: { source: "jsonld", confidence: "high", evidence: "totalTime" },
    servings: { source: "jsonld", confidence: "high", evidence: "recipeYield" },
    categoryTexts: { source: "jsonld", confidence: "high", evidence: "recipeCategory" },
    imageUrl: { source: "jsonld", confidence: "high", evidence: "image" },
  };
  return {
    fields,
    provenance,
    warnings,
    visibleText: "",
    structuredRecipeData: compactRecipe(recipe, baseUrl),
    sourceCounts: { jsonld: 1 },
  };
}

export function parseJsonLd(html: string, baseUrl: string): ParsedExtraction {
  const warnings: ImportWarning[] = [];
  let partialStructuredRecipeData: Record<string, unknown> | null = null;
  const $ = cheerio.load(html);
  for (const element of $("script[type='application/ld+json'], script[type='application/json+ld']").toArray()) {
    const raw = $(element).html()?.trim() ?? "";
    if (raw.length > MAX_JSONLD_CHARS) {
      warnings.push({ code: "MALFORMED_JSONLD_SKIPPED", field: null, message: "Ett för stort JSON-LD-block hoppades över." });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/^\s*\/\*|\*\/\s*$/g, ""));
    } catch {
      warnings.push({ code: "MALFORMED_JSONLD_SKIPPED", field: null, message: "Ett ogiltigt JSON-LD-block hoppades över." });
      continue;
    }
    const objects: Record<string, unknown>[] = [];
    collectObjects(parsed, objects);
    for (const object of objects) {
      if (!isRecipe(object)) continue;
      if (!partialStructuredRecipeData && fieldText(object.name)) partialStructuredRecipeData = compactRecipe(object, baseUrl);
      const candidate = candidateFromRecipe(object, baseUrl, warnings);
      if (candidate) return candidate;
    }
  }

  return {
    fields: emptyFields(),
    provenance: {},
    warnings,
    visibleText: "",
    structuredRecipeData: partialStructuredRecipeData,
    sourceCounts: {},
  };
}

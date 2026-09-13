import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { MAX_VISIBLE_TEXT_CHARS } from "./types";
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

function itempropElements($: cheerio.CheerioAPI, name: string) {
  return $("[itemprop]").filter((_, element) => {
    const values = ($(element).attr("itemprop") ?? "").split(/\s+/);
    return values.includes(name);
  });
}

function valueOf($: cheerio.CheerioAPI, element: AnyNode) {
  const node = $(element);
  return cleanText(node.attr("content") ?? node.attr("datetime") ?? node.attr("value") ?? node.text());
}

function leafValues($: cheerio.CheerioAPI, elements: cheerio.Cheerio<AnyNode>) {
  return cleanList(elements.toArray().filter((element) => {
    const parent = $(element).parents("[itemprop]").toArray();
    return !parent.some((ancestor) => ($(ancestor).attr("itemprop") ?? "").split(/\s+/).includes($(element).attr("itemprop") ?? ""));
  }).map((element) => valueOf($, element)));
}

function instructionValues($: cheerio.CheerioAPI, elements: cheerio.Cheerio<AnyNode>) {
  const values: string[] = [];
  for (const element of elements.toArray()) {
    const node = $(element);
    const listItems = node.is("li") ? [element] : node.find("li").toArray();
    if (listItems.length) values.push(...listItems.map((item) => valueOf($, item)));
    else values.push(valueOf($, element));
  }
  return cleanList(values);
}

function metadata($: cheerio.CheerioAPI, selector: string) {
  return cleanText($(selector).first().attr("content"));
}

function visibleText($: cheerio.CheerioAPI) {
  $("script, style, noscript, nav, footer, aside, form, svg, [hidden], [aria-hidden='true']").remove();
  $("[class], [id]").filter((_, element) => /(^|[-_\s])(ad|ads|advert|advertisement|comment|comments|sidebar|cookie|consent|navigation|nav|menu|promo|social|share)([-_\s]|$)/i.test(`${$(element).attr("class") ?? ""} ${$(element).attr("id") ?? ""}`)).remove();
  const root = $("main, article, [class*='recipe' i], [id*='recipe' i]").first();
  const text = (root.length ? root : $("body")).text().replace(/\s+/g, " ").trim();
  return text.slice(0, MAX_VISIBLE_TEXT_CHARS);
}

export function parseHtml(html: string, baseUrl: string): ParsedExtraction {
  const $ = cheerio.load(html);
  const fields = emptyFields();
  const provenance: Partial<Record<keyof ExtractionFields, FieldProvenance>> = {};
  const warnings: ImportWarning[] = [];
  const microdata = (name: string) => itempropElements($, name);

  const nameElements = microdata("name");
  fields.title = cleanText(nameElements.first().length ? valueOf($, nameElements.first()[0]) : $("h1").first().text()) || metadata($, "meta[property='og:title']") || null;
  if (nameElements.first().length) provenance.title = { source: "microdata", confidence: "medium", evidence: "[itemprop=\"name\"]" };
  else if ($("h1").first().length) provenance.title = { source: "html", confidence: "medium", evidence: "h1" };
  else if (metadata($, "meta[property='og:title']")) provenance.title = { source: "html", confidence: "low", evidence: "og:title" };

  const descriptionElements = microdata("description");
  fields.note = cleanText(descriptionElements.first().length ? valueOf($, descriptionElements.first()[0]) : metadata($, "meta[name='description']")) || null;
  if (descriptionElements.first().length) provenance.note = { source: "microdata", confidence: "medium", evidence: "[itemprop=\"description\"]" };
  else if (fields.note) provenance.note = { source: "html", confidence: "low", evidence: "meta[name=\"description\"]" };

  const ingredientElements = microdata("recipeIngredient");
  fields.ingredients = leafValues($, ingredientElements);
  if (fields.ingredients.length) provenance.ingredients = { source: "microdata", confidence: "medium", evidence: "[itemprop=\"recipeIngredient\"]" };

  const instructionElements = microdata("recipeInstructions");
  fields.instructions = instructionValues($, instructionElements);
  if (fields.instructions.length) provenance.instructions = { source: "microdata", confidence: "medium", evidence: "[itemprop=\"recipeInstructions\"]" };

  const times: Array<[keyof Pick<ExtractionFields, "prepMinutes" | "cookMinutes" | "totalMinutes">, string]> = [
    ["prepMinutes", "prepTime"],
    ["cookMinutes", "cookTime"],
    ["totalMinutes", "totalTime"],
  ];
  for (const [field, name] of times) {
    const elements = microdata(name);
    const raw = elements.first().length ? valueOf($, elements.first()[0]) : "";
    const parsed = parseDuration(raw);
    fields[field] = parsed.minutes;
    if (parsed.invalid) warnings.push({ code: "INVALID_DURATION", field, message: "En tidsangivelse kunde inte normaliseras." });
    if (parsed.minutes !== null) provenance[field] = { source: "microdata", confidence: "medium", evidence: `[itemprop="${name}"]` };
  }

  const yieldElements = microdata("recipeYield");
  fields.servings = parseYield(yieldElements.first().length ? valueOf($, yieldElements.first()[0]) : "");
  if (fields.servings) provenance.servings = { source: "microdata", confidence: "medium", evidence: "[itemprop=\"recipeYield\"]" };

  fields.categoryTexts = leafValues($, microdata("recipeCategory"));
  const imageElements = microdata("image");
  const imageRaw = imageElements.first().length ? $(imageElements.first()[0]).attr("content") ?? $(imageElements.first()[0]).attr("src") ?? valueOf($, imageElements.first()[0]) : metadata($, "meta[property='og:image']");
  fields.imageUrl = normalizeExternalUrl(imageRaw, baseUrl);
  if (fields.imageUrl) provenance.imageUrl = { source: imageElements.first().length ? "microdata" : "html", confidence: imageElements.first().length ? "medium" : "low", evidence: imageElements.first().length ? "[itemprop=\"image\"]" : "og:image" };

  return {
    fields,
    provenance,
    warnings,
    visibleText: visibleText(cheerio.load(html)),
    structuredRecipeData: null,
    sourceCounts: {
      ...(Object.keys(provenance).length ? { microdata: Object.keys(provenance).length } : {}),
      html: fields.title && !nameElements.first().length ? 1 : 0,
    },
  };
}

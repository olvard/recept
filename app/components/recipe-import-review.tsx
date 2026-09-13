"use client";

import type { FieldProvenance } from "@/lib/recipe-import/types";
import type { RecipeImportReview as RecipeImportReviewData } from "@/lib/recipe-import/frontend";

const fieldNames: Record<string, string> = {
  title: "Titel",
  note: "Beskrivning",
  categorySlugs: "Kategorier",
  ingredients: "Ingredienser",
  instructions: "Instruktioner",
  prepMinutes: "Förberedelsetid",
};

const sourceNames: Record<FieldProvenance["source"], string> = {
  jsonld: "strukturerad receptdata",
  microdata: "mikrodata",
  html: "sidans text",
  llm: "automatisk tolkning",
  derived: "härledd information",
};

export function RecipeImportReview({ review }: { review: RecipeImportReviewData }) {
  const provenance = Object.entries(review.provenance) as Array<[string, FieldProvenance]>;
  return <aside className="import-review" aria-labelledby="recipe-import-review-title"><p className="eyebrow">Granska importen</p><h3 id="recipe-import-review-title">Uppgifter från källan</h3><p className="import-source"><strong>Källa:</strong> <a href={review.sourceUrl} target="_blank" rel="noreferrer">{review.sourceUrl}</a></p>{review.context && <p className="import-context"><strong>Kontext:</strong> {review.context}</p>}{provenance.length > 0 && <p className="import-provenance"><strong>Tolkning:</strong> {provenance.map(([field, value]) => `${fieldNames[field] ?? field} (${sourceNames[value.source]})`).join(", ")}</p>}{review.warnings.length > 0 && <div className="import-warnings"><strong>Värt att kontrollera</strong><ul>{review.warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}</ul></div>}</aside>;
}

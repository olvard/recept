import type { RecipeDraft } from "@/lib/recipe-vault";
import type { FieldProvenance, NormalizedRecipeImport, RecipeImportResponse } from "./types";

export type RecipeImportReview = {
  sourceUrl: string;
  context: string;
  warnings: RecipeImportResponse["warnings"];
  provenance: Partial<Record<keyof NormalizedRecipeImport, FieldProvenance>>;
};

export function recipeImportToDraft(result: NormalizedRecipeImport): RecipeDraft {
  return {
    title: result.title,
    categorySlugs: [...result.categorySlugs],
    note: result.note,
    prepMinutes: result.prepMinutes ?? undefined,
    ingredients: [...result.ingredients],
    instructions: [...result.instructions],
    context: result.context,
  };
}

export function recipeImportToReview(response: RecipeImportResponse): RecipeImportReview {
  return {
    sourceUrl: response.result.sourceUrl,
    context: response.result.context,
    warnings: response.warnings,
    provenance: response.provenance,
  };
}

export function recipeImportUrlError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Klistra in en webbadress till receptet.";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "Ange en webbadress som börjar med http:// eller https://.";
    if (!url.hostname) return "Ange en fullständig webbadress.";
  } catch {
    return "Ange en giltig webbadress.";
  }
  return null;
}

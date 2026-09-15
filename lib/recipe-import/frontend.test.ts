import { describe, expect, it } from "vitest";
import { recipeImportToDraft, recipeImportToReview, recipeImportUrlError } from "./frontend";
import type { RecipeImportResponse } from "./types";

const response: RecipeImportResponse = {
  status: "needs_review",
  result: {
    title: "Rostad soppa",
    note: "En varm soppa.",
    categorySlugs: ["middag"],
    categoryCandidates: ["Middag"],
    ingredients: ["2 morötter"],
    instructions: ["Rosta morötterna."],
    prepMinutes: 15,
    cookMinutes: 25,
    totalMinutes: 40,
    servings: { value: 4, rawText: "4 portioner" },
    sourceUrl: "https://example.test/soppa",
    imageUrl: "https://example.test/soppa.jpg",
  },
  provenance: { title: { source: "jsonld", confidence: "high", evidence: "name" } },
  warnings: [{ code: "CHECK", field: "servings", message: "Kontrollera portionerna." }],
};

describe("recipe import frontend helpers", () => {
  it("maps only fields supported by RecipeDraft", () => {
    const draft = recipeImportToDraft(response.result);

    expect(draft).toEqual({
      title: "Rostad soppa",
      categorySlugs: ["middag"],
      note: "En varm soppa.",
      prepMinutes: 15,
      ingredients: ["2 morötter"],
      instructions: ["Rosta morötterna."],
    });
    expect(draft).not.toHaveProperty("servings");
    expect(draft).not.toHaveProperty("cookMinutes");
    expect(draft).not.toHaveProperty("totalMinutes");
    expect(draft).not.toHaveProperty("imageUrl");
    expect(draft).not.toHaveProperty("sourceUrl");
  });

  it("keeps the source review separate from the draft", () => {
    expect(recipeImportToReview(response)).toEqual({
      sourceUrl: "https://example.test/soppa",
      warnings: response.warnings,
      provenance: response.provenance,
    });
  });

  it("validates web addresses before making an API request", () => {
    expect(recipeImportUrlError("")).toBe("Klistra in en webbadress till receptet.");
    expect(recipeImportUrlError("example.test/recept")).toBe("Ange en giltig webbadress.");
    expect(recipeImportUrlError("ftp://example.test/recept")).toContain("http://");
    expect(recipeImportUrlError("https://example.test/recept")).toBeNull();
  });
});

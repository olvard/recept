import recipeData from "@/data/recipes.json";

export type Recipe = (typeof recipeData)[number];
export type FixtureRecipe = Recipe;

export const recipes = recipeData as Recipe[];

export const categories = [
  { name: "Lunch", slug: "lunch" },
  { name: "Middag", slug: "middag" },
  { name: "Matlådor", slug: "matlador" },
] as const;

export function getRecipe(id: string) {
  return recipes.find((recipe) => recipe.id === id || recipe.slug === id);
}

/** The stable category label used when a fixture is shown in the phase 2 vault. */
export function getCategoryName(slug: string) {
  return categories.find((category) => category.slug === slug)?.name ?? slug;
}

/**
 * Converts the immutable fixture shape to the canonical recipe shape without
 * making the repository depend on the browser or on React.
 */
export function toCanonicalFixtureRecipe(recipe: FixtureRecipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    categorySlugs: [recipe.categorySlug],
    categoryNames: [recipe.category],
    prepMinutes: recipe.prepMinutes,
    archivedAt: recipe.archivedAt,
    note: recipe.note ?? "",
    context: recipe.context,
    ingredients: [...recipe.ingredients],
    instructions: [...recipe.instructions],
  };
}

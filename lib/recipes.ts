import recipeData from "@/data/recipes.json";

export type Recipe = (typeof recipeData)[number];

export const recipes = recipeData as Recipe[];

export const categories = [
  { name: "Lunch", slug: "lunch" },
  { name: "Middag", slug: "middag" },
  { name: "Matlådor", slug: "matlador" },
] as const;

export function getRecipe(id: string) {
  return recipes.find((recipe) => recipe.id === id || recipe.slug === id);
}

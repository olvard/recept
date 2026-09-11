#!/usr/bin/env node
// Run from a freshly created dedicated recipe-db repository, passing this
// application's fixture file: node seed-recipe-db.mjs ../recept/data/recipes.json
import fs from "node:fs";
import path from "node:path";

const source = process.argv[2];
if (!source) throw new Error("Ange sökvägen till data/recipes.json.");
const recipes = JSON.parse(fs.readFileSync(source, "utf8")).map((recipe) => ({
  id: recipe.id, slug: recipe.slug, title: recipe.title,
  categorySlugs: [recipe.categorySlug], categoryNames: [recipe.category],
  prepMinutes: recipe.prepMinutes, archivedAt: recipe.archivedAt,
  note: recipe.note ?? "", context: recipe.context, ingredients: recipe.ingredients,
  instructions: recipe.instructions, deletedAt: null,
}));
fs.mkdirSync("recipes", { recursive: true });
for (const recipe of recipes) fs.writeFileSync(path.join("recipes", `${recipe.id}-${recipe.slug}.json`), `${JSON.stringify(recipe, null, 2)}\n`);
const index = recipes.map((recipe) => ({ id: recipe.id, slug: recipe.slug, title: recipe.title, categorySlugs: recipe.categorySlugs, categoryNames: recipe.categoryNames, prepMinutes: recipe.prepMinutes, archivedAt: recipe.archivedAt, note: recipe.note, context: recipe.context, deletedAt: recipe.deletedAt })).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt) || Number(b.id) - Number(a.id));
fs.writeFileSync("index.json", `${JSON.stringify(index, null, 2)}\n`);

"use client";
import Link from "next/link";
import { categories } from "@/lib/recipes";
import { useRecipeVault } from "@/app/components/recipe-vault-provider";
export function CategoryCollection() {
  const { recipes } = useRecipeVault();
  return <section className="category-grid">{categories.map((category) => { const count = recipes.filter((recipe) => recipe.categorySlugs.includes(category.slug)).length; return <Link className="category-card" key={category.slug} href={`/vault?category=${category.slug}`}><p className="archive-line">{count} recept</p><h2>{category.name}</h2><span>Öppna samling →</span></Link>; })}</section>;
}

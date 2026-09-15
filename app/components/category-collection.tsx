"use client";
import Link from "next/link";
import { categories } from "@/lib/recipes";
import { useRecipeVault } from "@/app/components/recipe-vault-provider";
export function CategoryCollection() {
  const { recipes } = useRecipeVault();
  return <section className="category-grid" aria-label="Receptkategorier">{categories.map((category, index) => { const count = recipes.filter((recipe) => recipe.categorySlugs.includes(category.slug)).length; return <Link className="category-card" key={category.slug} href={`/vault?category=${category.slug}`}><span className="category-index">{String(index + 1).padStart(2, "0")}</span><span className="category-card-main"><span className="archive-line">{String(count).padStart(2, "0")} recept</span><h2>{category.name}</h2></span><span className="category-open">Öppna samling <span aria-hidden="true">→</span></span></Link>; })}</section>;
}

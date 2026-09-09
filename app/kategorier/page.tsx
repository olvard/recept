import Link from "next/link";
import { categories, recipes } from "@/lib/recipes";

export default function CategoriesPage() {
  return <div className="page-wrap categories-page"><section className="page-intro"><p className="eyebrow">Samlingar</p><h1>Kategorier</h1><p>Tre hyllor för det som återkommer i köket.</p></section><section className="category-grid">{categories.map((category) => { const count = recipes.filter((recipe) => recipe.categorySlug === category.slug).length; return <Link className="category-card" key={category.slug} href={`/vault?category=${category.slug}`}><p className="archive-line">{count} {count === 1 ? "recept" : "recept"}</p><h2>{category.name}</h2><span>Öppna samling →</span></Link>; })}</section></div>;
}

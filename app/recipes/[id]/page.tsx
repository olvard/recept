import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe, recipes } from "@/lib/recipes";

export function generateStaticParams() { return recipes.map((recipe) => ({ id: recipe.id })); }
export const dynamicParams = false;

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) notFound();
  return <article className="page-wrap recipe-detail">
    <nav className="breadcrumbs" aria-label="Brödsmulor"><Link href="/vault">Recept</Link><span>/</span><Link href={`/vault?category=${recipe.categorySlug}`}>{recipe.category}</Link><span>/</span><span aria-current="page">{recipe.title}</span></nav>
    <header className="detail-header"><p className="eyebrow">#{recipe.id} · {recipe.category} · {recipe.prepMinutes} min</p><h1>{recipe.title}</h1><p>{recipe.note}</p><p className="context">{recipe.context}</p></header>
    <div className="detail-grid"><section><h2>Ingredienser</h2><ul className="ingredients">{recipe.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></section><section><h2>Gör så här</h2><ol className="instructions">{recipe.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section></div>
    <Link className="back-link" href="/vault">← Tillbaka till Recept</Link>
  </article>;
}

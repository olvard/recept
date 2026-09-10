"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useRecipeEditor } from "@/app/components/app-shell";
import { useRecipeVault } from "@/app/components/recipe-vault-provider";
import { VaultCatalog } from "@/app/components/vault-catalog";

export function VaultContent() {
  const id = useSearchParams().get("recipe");
  return id ? <VaultRecipeDetail id={id} /> : <VaultCatalog />;
}

function VaultRecipeDetail({ id }: { id: string }) {
  const router = useRouter(); const { recipes, isHydrated, remove, storageError } = useRecipeVault(); const { openEdit } = useRecipeEditor();
  const [confirming, setConfirming] = useState(false); const recipe = recipes.find((item) => item.id === id);
  if (!recipe) return <section className="page-wrap not-found"><p className="eyebrow">Vault</p><h1>{isHydrated ? "Receptet finns inte längre" : "Laddar receptet"}</h1><p>{isHydrated ? "Receptet kan ha tagits bort eller länken är felaktig." : "Arkivet läses in från webbläsaren."}</p><Link className="button" href="/vault">Tillbaka till Recept</Link></section>;
  return <article className="page-wrap recipe-detail"><nav className="breadcrumbs" aria-label="Brödsmulor"><Link href="/vault">Recept</Link><span>/</span><Link href={`/vault?category=${recipe.categorySlugs[0]}`}>{recipe.categoryNames.join(" · ")}</Link><span>/</span><span aria-current="page">{recipe.title}</span></nav>
    <header className="detail-header"><p className="eyebrow">#{recipe.id} · {recipe.categoryNames.join(" · ")} · {recipe.prepMinutes} min</p><h1>{recipe.title}</h1>{recipe.note && <p>{recipe.note}</p>}<p className="context">{recipe.context}</p><div className="detail-actions"><button className="button" type="button" onClick={() => openEdit(recipe)}>Redigera</button><button className="text-button danger-button" type="button" onClick={() => setConfirming(true)}>Ta bort</button></div></header>
    <div className="detail-grid"><section><h2>Ingredienser</h2><ul className="ingredients">{recipe.ingredients.map((ingredient, index) => <li key={`${ingredient}-${index}`}>{ingredient}</li>)}</ul></section><section><h2>Gör så här</h2><ol className="instructions">{recipe.instructions.map((instruction, index) => <li key={`${instruction}-${index}`}>{instruction}</li>)}</ol></section></div><Link className="back-link" href="/vault">← Tillbaka till Recept</Link>
    {confirming && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(false); }}><section className="dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><p className="eyebrow">Bekräfta</p><h2 id="delete-title">Ta bort receptet?</h2><p>Detta tar bort receptet från detta webbläsararkiv.</p>{storageError && <p className="form-errors" role="alert">{storageError}</p>}<div className="dialog-actions"><button className="text-button" type="button" autoFocus onClick={() => setConfirming(false)}>Avbryt</button><button className="button danger-action" type="button" onClick={() => { if (remove(id)) router.push("/vault"); }}>Ta bort</button></div></section></div>}
  </article>;
}

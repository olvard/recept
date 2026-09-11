"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CanonicalRecipe } from "@/lib/recipe-vault";
import { RecipeEditorForm } from "@/app/components/recipe-editor-form";
import { useRecipeVault } from "@/app/components/recipe-vault-provider";

export function MobileRecipeEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { isHydrated } = useRecipeVault();
  const [recipe, setRecipe] = useState<CanonicalRecipe | undefined>();
  const [loaded, setLoaded] = useState(!id);
  useEffect(() => { if (!id) return; fetch(`/api/recipes/${id}`).then(async (response) => response.ok ? response.json() as Promise<{ recipe: CanonicalRecipe }> : Promise.reject()).then((data) => setRecipe(data.recipe)).finally(() => setLoaded(true)); }, [id]);
  const close = () => router.back();
  if (!isHydrated) return <div className="page-wrap loading-state"><p className="eyebrow">Nytt recept</p><p>Laddar arkivet…</p></div>;
  if (id && !loaded) return <div className="page-wrap loading-state"><p>Laddar receptet…</p></div>;
  if (id && !recipe) return <div className="page-wrap editor-page"><p className="eyebrow">Receptet saknas</p><h1>Hittar inte receptet</h1><p>Receptet finns inte längre i arkivet.</p><button className="button" type="button" onClick={close}>Tillbaka</button></div>;
  return <div className="page-wrap editor-page"><RecipeEditorForm mode={recipe ? "edit" : "create"} recipe={recipe} onClose={close} onSaved={(saved) => router.push(`/recipes/${saved.id}`)} className="mobile-editor" /></div>;
}

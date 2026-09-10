"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { RecipeEditorForm } from "@/app/components/recipe-editor-form";
import { useRecipeVault } from "@/app/components/recipe-vault-provider";

export function MobileRecipeEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { recipes, isHydrated } = useRecipeVault();
  const recipe = id ? recipes.find((item) => item.id === id) : undefined;
  const close = () => router.back();
  if (!isHydrated) return <div className="page-wrap loading-state"><p className="eyebrow">Nytt recept</p><p>Laddar arkivet…</p></div>;
  if (id && !recipe) return <div className="page-wrap editor-page"><p className="eyebrow">Receptet saknas</p><h1>Hittar inte receptet</h1><p>Receptet finns inte längre i ditt arkiv.</p><button className="button" type="button" onClick={close}>Tillbaka</button></div>;
  return <div className="page-wrap editor-page"><RecipeEditorForm mode={recipe ? "edit" : "create"} recipe={recipe} onClose={close} onSaved={(saved) => router.push(`/vault?recipe=${saved.id}`)} className="mobile-editor" /></div>;
}

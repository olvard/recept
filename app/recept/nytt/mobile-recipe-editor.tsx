"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CanonicalRecipe } from "@/lib/recipe-vault";
import type { RecipeDraft } from "@/lib/recipe-vault";
import type { RecipeImportReview } from "@/lib/recipe-import/frontend";
import { RecipeEditorForm } from "@/app/components/recipe-editor-form";
import { NewRecipeChoice } from "@/app/components/new-recipe-choice";
import { RecipeImportForm } from "@/app/components/recipe-import-form";
import { useRecipeVault } from "@/app/components/recipe-vault-provider";

export function MobileRecipeEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { isHydrated } = useRecipeVault();
  const [recipe, setRecipe] = useState<CanonicalRecipe | undefined>();
  const [loaded, setLoaded] = useState(!id);
  const [flow, setFlow] = useState<"choice" | "import" | "create">("choice");
  const [initialDraft, setInitialDraft] = useState<RecipeDraft>();
  const [importReview, setImportReview] = useState<RecipeImportReview>();
  useEffect(() => { if (!id) return; fetch(`/api/recipes/${id}`).then(async (response) => response.ok ? response.json() as Promise<{ recipe: CanonicalRecipe }> : Promise.reject()).then((data) => setRecipe(data.recipe)).finally(() => setLoaded(true)); }, [id]);
  const close = () => router.back();
  if (!isHydrated) return <div className="page-wrap loading-state"><h1 className="sr-only">Nytt recept</h1><p className="eyebrow">Nytt recept</p><p>Laddar arkivet…</p></div>;
  if (id && !loaded) return <div className="page-wrap loading-state"><h1 className="sr-only">Nytt recept</h1><p>Laddar receptet…</p></div>;
  if (id && !recipe) return <div className="page-wrap editor-page"><p className="eyebrow">Receptet saknas</p><h1>Hittar inte receptet</h1><p>Receptet finns inte längre i arkivet.</p><button className="button" type="button" onClick={close}>Tillbaka</button></div>;
  if (!id && flow === "choice") return <div className="page-wrap editor-page"><h1 className="sr-only">Nytt recept</h1><NewRecipeChoice onCreate={() => setFlow("create")} onImport={() => setFlow("import")} onBack={close} /></div>;
  if (!id && flow === "import") return <div className="page-wrap editor-page"><h1 className="sr-only">Nytt recept</h1><RecipeImportForm onBack={() => setFlow("choice")} onImported={(draft, review) => { setInitialDraft(draft); setImportReview(review); setFlow("create"); }} /></div>;
  return <div className="page-wrap editor-page"><h1 className="sr-only">{recipe ? "Redigera recept" : "Nytt recept"}</h1><RecipeEditorForm mode={recipe ? "edit" : "create"} recipe={recipe} initialDraft={initialDraft} importReview={importReview} onClose={close} onSaved={(saved) => router.push(`/recipes/${saved.id}`)} className="mobile-editor" /></div>;
}

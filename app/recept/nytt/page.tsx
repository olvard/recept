import { Suspense } from "react";
import { MobileRecipeEditor } from "@/app/recept/nytt/mobile-recipe-editor";

export default function NewRecipePage() {
  return <Suspense fallback={<div className="page-wrap loading-state"><p className="eyebrow">Nytt recept</p><p>Laddar formuläret…</p></div>}><MobileRecipeEditor /></Suspense>;
}

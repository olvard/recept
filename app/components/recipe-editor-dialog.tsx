"use client";

import type { CanonicalRecipe } from "@/lib/recipe-vault";
import type { RecipeDraft } from "@/lib/recipe-vault";
import type { RecipeImportReview } from "@/lib/recipe-import/frontend";
import { RecipeEditorForm } from "@/app/components/recipe-editor-form";
import { ModalDialog } from "@/app/components/modal-dialog";

export function RecipeEditorDialog({ mode, recipe, initialDraft, importReview, onClose, onSaved }: { mode: "create" | "edit"; recipe?: CanonicalRecipe; initialDraft?: RecipeDraft; importReview?: RecipeImportReview; onClose: () => void; onSaved: (recipe: CanonicalRecipe) => void }) {
  return <ModalDialog titleId="recipe-editor-title" onClose={onClose} className="editor-dialog"><RecipeEditorForm mode={mode} recipe={recipe} initialDraft={initialDraft} importReview={importReview} onClose={onClose} onSaved={onSaved} /></ModalDialog>;
}

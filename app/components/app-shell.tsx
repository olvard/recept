"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { RecipeEditorDialog } from "@/app/components/recipe-editor-dialog";
import { ModalDialog } from "@/app/components/modal-dialog";
import { NewRecipeChoice } from "@/app/components/new-recipe-choice";
import { RecipeImportForm } from "@/app/components/recipe-import-form";
import { RecipeVaultProvider, useRecipeVault } from "@/app/components/recipe-vault-provider";
import type { CanonicalRecipe } from "@/lib/recipe-vault";
import type { RecipeDraft } from "@/lib/recipe-vault";
import type { RecipeImportReview } from "@/lib/recipe-import/frontend";

type EditorControls = { openCreate: () => void; openEdit: (recipe: CanonicalRecipe) => void };
type EditorState = { mode: "create" | "edit"; recipe?: CanonicalRecipe; initialDraft?: RecipeDraft; importReview?: RecipeImportReview };
const EditorContext = createContext<EditorControls | null>(null);
export function useRecipeEditor() { const value = useContext(EditorContext); if (!value) throw new Error("useRecipeEditor måste användas i AppShell."); return value; }

function ShellContents({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { isHydrated } = useRecipeVault();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [newRecipeFlow, setNewRecipeFlow] = useState<"choice" | "import" | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const choiceFocusRef = useRef<HTMLButtonElement>(null);
  const importFocusRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const media = window.matchMedia("(max-width: 767px)"); const update = () => setIsMobile(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  const vaultActive = pathname === "/vault" || pathname.startsWith("/recipes");
  const controls = { openCreate: () => { if (isMobile) router.push("/recept/nytt"); else setNewRecipeFlow("choice"); }, openEdit: (recipe: CanonicalRecipe) => { if (isMobile) router.push(`/recept/nytt?id=${recipe.id}`); else setEditor({ mode: "edit", recipe }); } };
  const openCreateEditor = () => { setNewRecipeFlow(null); setEditor({ mode: "create" }); };
  const openImportedEditor = (initialDraft: RecipeDraft, importReview: RecipeImportReview) => { setNewRecipeFlow(null); setEditor({ mode: "create", initialDraft, importReview }); };
  return <EditorContext.Provider value={controls}><div className="site-frame">
      <header className="site-header">
        <Link className="wordmark" href="/vault">Recept</Link>
        <nav className="desktop-nav" aria-label="Huvudnavigering">
          <Link className={vaultActive ? "active" : ""} href="/vault">Recept</Link>
          <Link className={pathname === "/kategorier" ? "active" : ""} href="/kategorier">Kategorier</Link>
        </nav>
        <button className="new-post header-new-post" type="button" onClick={controls.openCreate}>+ Nytt recept</button>
        <div className="attribution"><span>Oliver</span><span>V.1</span><span>{isHydrated ? "personligt arkiv" : "läser arkivet"}</span></div>
      </header>
       <main>{children}</main>
       <footer>Oliver Lundin · Created 2026</footer>
     {newRecipeFlow === "choice" && <ModalDialog titleId="new-recipe-choice-title" onClose={() => setNewRecipeFlow(null)} initialFocusRef={choiceFocusRef} showClose><NewRecipeChoice firstFocusRef={choiceFocusRef} onCreate={openCreateEditor} onImport={() => setNewRecipeFlow("import")} /></ModalDialog>}
     {newRecipeFlow === "import" && <ModalDialog titleId="recipe-import-title" onClose={() => setNewRecipeFlow(null)} className="import-dialog" initialFocusRef={importFocusRef} showClose><RecipeImportForm firstFocusRef={importFocusRef} onBack={() => setNewRecipeFlow("choice")} onImported={openImportedEditor} /></ModalDialog>}
     {editor && <RecipeEditorDialog mode={editor.mode} recipe={editor.recipe} initialDraft={editor.initialDraft} importReview={editor.importReview} onClose={() => setEditor(null)} onSaved={(recipe) => { setEditor(null); router.push(`/recipes/${recipe.id}`); }} />}
     </div></EditorContext.Provider>;
}

export function AppShell({ children }: { children: React.ReactNode }) { return <RecipeVaultProvider><ShellContents>{children}</ShellContents></RecipeVaultProvider>; }

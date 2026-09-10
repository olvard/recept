"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { RecipeEditorDialog } from "@/app/components/recipe-editor-dialog";
import { RecipeVaultProvider, useRecipeVault } from "@/app/components/recipe-vault-provider";
import type { MergedRecipe } from "@/lib/recipe-vault";

type EditorControls = { openCreate: () => void; openEdit: (recipe: MergedRecipe) => void };
const EditorContext = createContext<EditorControls | null>(null);
export function useRecipeEditor() { const value = useContext(EditorContext); if (!value) throw new Error("useRecipeEditor måste användas i AppShell."); return value; }

function ShellContents({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { isHydrated } = useRecipeVault();
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; recipe?: MergedRecipe } | null>(null);
  const vaultActive = pathname === "/vault" || pathname.startsWith("/recipes");
  const controls = { openCreate: () => setEditor({ mode: "create" }), openEdit: (recipe: MergedRecipe) => setEditor({ mode: "edit", recipe }) };
  return <EditorContext.Provider value={controls}><div className="site-frame">
      <header className="site-header">
        <Link className="wordmark" href="/vault">Recept</Link>
        <nav className="desktop-nav" aria-label="Huvudnavigering">
          <Link className={vaultActive ? "active" : ""} href="/vault">Recept</Link>
          <Link className={pathname === "/kategorier" ? "active" : ""} href="/kategorier">Kategorier</Link>
        </nav>
        <button className="new-post header-new-post" type="button" onClick={controls.openCreate}>+ Nytt recept</button>
        <div className="attribution"><span>Oliver</span><span>V.1</span><span>{isHydrated ? "personligt arkiv" : "8 arkiverade recept"}</span></div>
      </header>
      <main>{children}</main>
      <footer>Oliver Lundin · Created 2026</footer>
      <nav className="mobile-nav" aria-label="Mobilnavigering">
        <Link className={vaultActive ? "active" : ""} href="/vault">Recept</Link>
        <Link className={pathname === "/kategorier" ? "active" : ""} href="/kategorier">Kategorier</Link><button type="button" onClick={controls.openCreate}>+ Nytt recept</button>
      </nav>
    {editor && <RecipeEditorDialog mode={editor.mode} recipe={editor.recipe} onClose={() => setEditor(null)} onSaved={(recipe) => { setEditor(null); router.push(`/vault?recipe=${recipe.id}`); }} />}
    </div></EditorContext.Provider>;
}

export function AppShell({ children }: { children: React.ReactNode }) { return <RecipeVaultProvider><ShellContents>{children}</ShellContents></RecipeVaultProvider>; }

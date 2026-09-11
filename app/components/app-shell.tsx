"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { RecipeEditorDialog } from "@/app/components/recipe-editor-dialog";
import { RecipeVaultProvider, useRecipeVault } from "@/app/components/recipe-vault-provider";
import type { CanonicalRecipe } from "@/lib/recipe-vault";

type EditorControls = { openCreate: () => void; openEdit: (recipe: CanonicalRecipe) => void };
const EditorContext = createContext<EditorControls | null>(null);
export function useRecipeEditor() { const value = useContext(EditorContext); if (!value) throw new Error("useRecipeEditor måste användas i AppShell."); return value; }

function ShellContents({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { isHydrated } = useRecipeVault();
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; recipe?: CanonicalRecipe } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const media = window.matchMedia("(max-width: 767px)"); const update = () => setIsMobile(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  const vaultActive = pathname === "/vault" || pathname.startsWith("/recipes");
  const controls = { openCreate: () => { if (isMobile) router.push("/recept/nytt"); else setEditor({ mode: "create" }); }, openEdit: (recipe: CanonicalRecipe) => { if (isMobile) router.push(`/recept/nytt?id=${recipe.id}`); else setEditor({ mode: "edit", recipe }); } };
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
      <nav className="mobile-nav" aria-label="Mobilnavigering">
        <Link className={vaultActive ? "active" : ""} href="/vault">Recept</Link>
        <Link className={pathname === "/kategorier" ? "active" : ""} href="/kategorier">Kategorier</Link><button className={pathname === "/recept/nytt" ? "active" : ""} type="button" onClick={controls.openCreate}>+ Nytt recept</button>
      </nav>
    {editor && <RecipeEditorDialog mode={editor.mode} recipe={editor.recipe} onClose={() => setEditor(null)} onSaved={(recipe) => { setEditor(null); router.push(`/recipes/${recipe.id}`); }} />}
    </div></EditorContext.Provider>;
}

export function AppShell({ children }: { children: React.ReactNode }) { return <RecipeVaultProvider><ShellContents>{children}</ShellContents></RecipeVaultProvider>; }

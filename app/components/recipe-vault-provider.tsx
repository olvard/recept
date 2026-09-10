"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearDraft as persistClearDraft, createRecipeFromDraft, deleteLocalRecipe, editRecipeFromDraft,
  fixtureToCanonical, mergeRecipes, persistRecipe, readDrafts, readRecipeVaultState,
  saveDeletedFixtureIds, saveDraft as persistDraft, type MergedRecipe, type RecipeDraft, type RecipeVaultState,
} from "@/lib/recipe-vault";
import { recipes } from "@/lib/recipes";

type VaultContextValue = {
  isHydrated: boolean;
  recipes: MergedRecipe[];
  drafts: Record<string, RecipeDraft>;
  storageError: string | null;
  saveDraft: (key: string, draft: RecipeDraft) => boolean;
  clearDraft: (key: string) => boolean;
  publish: (draft: RecipeDraft) => MergedRecipe | null;
  edit: (id: string, draft: RecipeDraft) => MergedRecipe | null;
  remove: (id: string) => boolean;
};

const fixtureState: RecipeVaultState = { recipes: { version: 1, additions: [], overlays: [] }, deletedFixtureIds: [] };
const VaultContext = createContext<VaultContextValue | null>(null);

export function RecipeVaultProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RecipeVaultState>(fixtureState);
  const [drafts, setDrafts] = useState<Record<string, RecipeDraft>>({});
  const [isHydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => { setState(readRecipeVaultState()); setDrafts(readDrafts()); setHydrated(true); }, 0); return () => window.clearTimeout(timer); }, []);
  const merged = useMemo(() => mergeRecipes(state), [state]);
  const fail = () => { setStorageError("Kunde inte spara i webbläsaren. Kontrollera webbläsarens lagring och försök igen."); return false; };
  const saveDraft = useCallback((key: string, draft: RecipeDraft) => {
    if (!persistDraft(draft, key)) return fail();
    setDrafts((current) => ({ ...current, [key]: draft })); setStorageError(null); return true;
  }, []);
  const clearDraft = useCallback((key: string) => {
    if (!persistClearDraft(key)) return fail();
    setDrafts((current) => { const next = { ...current }; delete next[key]; return next; }); setStorageError(null); return true;
  }, []);
  const publish = useCallback((draft: RecipeDraft) => {
    try {
      const recipe = createRecipeFromDraft(draft, state);
      if (!persistRecipe(recipe, state)) { fail(); return null; }
      const next = { ...state, recipes: { ...state.recipes, additions: [...state.recipes.additions, recipe] } };
      setState(next); setStorageError(null); return recipe;
    } catch { setStorageError("Receptet kunde inte publiceras. Kontrollera de markerade fälten."); return null; }
  }, [state]);
  const edit = useCallback((id: string, draft: RecipeDraft) => {
    const current = merged.find((recipe) => recipe.id === id);
    if (!current) return null;
    try {
      const recipe = editRecipeFromDraft(current, draft);
      if (!persistRecipe(recipe, state)) { fail(); return null; }
      const isFixture = recipes.some((fixture) => fixture.id === id);
      const nextRecipes = isFixture
        ? { ...state.recipes, overlays: [...state.recipes.overlays.filter((item) => item.id !== id), (() => { const overlay = { ...recipe }; delete (overlay as Partial<typeof overlay>).source; return overlay; })()] }
        : { ...state.recipes, additions: state.recipes.additions.map((item) => item.id === id ? { ...recipe, source: "local" as const } : item) };
      setState({ ...state, recipes: nextRecipes }); setStorageError(null); return recipe;
    } catch { setStorageError("Receptet kunde inte sparas. Kontrollera de markerade fälten."); return null; }
  }, [merged, state]);
  const remove = useCallback((id: string) => {
    const isFixture = recipes.some((fixture) => fixture.id === id);
    const ok = isFixture ? saveDeletedFixtureIds([...state.deletedFixtureIds, id]) : deleteLocalRecipe(id, state);
    if (!ok) return fail();
    setState(isFixture
      ? { ...state, deletedFixtureIds: [...new Set([...state.deletedFixtureIds, id])] }
      : { ...state, recipes: { ...state.recipes, additions: state.recipes.additions.filter((recipe) => recipe.id !== id) } });
    setStorageError(null); return true;
  }, [state]);
  const value = useMemo(() => ({ isHydrated, recipes: merged, drafts, storageError, saveDraft, clearDraft, publish, edit, remove }), [isHydrated, merged, drafts, storageError, saveDraft, clearDraft, publish, edit, remove]);
  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useRecipeVault() {
  const value = useContext(VaultContext);
  if (!value) throw new Error("useRecipeVault måste användas i RecipeVaultProvider.");
  return value;
}

export function fixtureRecipesForFirstRender() {
  return recipes.map((recipe) => ({ ...fixtureToCanonical(recipe), source: "fixture" as const }));
}

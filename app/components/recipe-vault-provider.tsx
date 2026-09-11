"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearDraft as persistClearDraft, clearLegacyPublishedState, readDrafts, saveDraft as persistDraft, type CanonicalRecipe, type RecipeDraft, type RecipeSummary } from "@/lib/recipe-vault";

type VaultContextValue = { isHydrated: boolean; recipes: RecipeSummary[]; drafts: Record<string, RecipeDraft>; storageError: string | null; saveDraft: (key: string, draft: RecipeDraft) => boolean; clearDraft: (key: string) => boolean; publish: (draft: RecipeDraft) => Promise<CanonicalRecipe | null>; edit: (id: string, draft: RecipeDraft) => Promise<CanonicalRecipe | null>; remove: (id: string) => Promise<boolean>; };
const VaultContext = createContext<VaultContextValue | null>(null);
async function api<T>(url: string, init?: RequestInit): Promise<T> { const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } }); const body = await response.json().catch(() => ({})) as T & { error?: string }; if (!response.ok) throw new Error(body.error ?? "Kunde inte nå receptarkivet."); return body; }
async function editorAccess() { const password = window.prompt("Lösenord för redaktörsåtkomst"); if (password === null) return false; await api("/api/auth/session", { method: "POST", body: JSON.stringify({ password }) }); return true; }

export function RecipeVaultProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]); const [drafts, setDrafts] = useState<Record<string, RecipeDraft>>({}); const [isHydrated, setHydrated] = useState(false); const [storageError, setStorageError] = useState<string | null>(null);
  useEffect(() => { const load = async () => { setDrafts(readDrafts()); const migrated = clearLegacyPublishedState(); if (migrated) setStorageError("Tidigare lokalt publicerade recept har rensats. De finns inte i det nya delade arkivet; återskapa dem vid behov."); try { const data = await api<{ recipes: RecipeSummary[] }>("/api/recipes"); setRecipes(data.recipes); } catch (error) { setStorageError(error instanceof Error ? error.message : "Kunde inte läsa receptarkivet."); } finally { setHydrated(true); } }; void load(); }, []);
  const fail = useCallback((message = "Kunde inte spara i webbläsaren.") => { setStorageError(message); return false; }, []);
  const saveDraft = useCallback((key: string, draft: RecipeDraft) => { if (!persistDraft(draft, key)) return fail(); setDrafts((current) => ({ ...current, [key]: draft })); return true; }, [fail]);
  const clearDraft = useCallback((key: string) => { if (!persistClearDraft(key)) return fail(); setDrafts((current) => { const next = { ...current }; delete next[key]; return next; }); return true; }, [fail]);
  const mutate = useCallback(async (url: string, method: string, draft?: RecipeDraft) => { try { let result: { recipe: CanonicalRecipe; index: RecipeSummary[] }; try { result = await api(url, { method, body: draft ? JSON.stringify(draft) : undefined }); } catch (error) { if (!(error instanceof Error) || !error.message.includes("Redaktörsåtkomst")) throw error; if (!await editorAccess()) return null; result = await api(url, { method, body: draft ? JSON.stringify(draft) : undefined }); } setRecipes(result.index); setStorageError(null); return result.recipe; } catch (error) { setStorageError(error instanceof Error ? error.message : "Receptet kunde inte sparas."); return null; } }, []);
  const publish = useCallback((draft: RecipeDraft) => mutate("/api/recipes", "POST", draft), [mutate]);
  const edit = useCallback((id: string, draft: RecipeDraft) => mutate(`/api/recipes/${id}`, "PUT", draft), [mutate]);
  const remove = useCallback(async (id: string) => Boolean(await mutate(`/api/recipes/${id}`, "DELETE")), [mutate]);
  const value = useMemo(() => ({ isHydrated, recipes, drafts, storageError, saveDraft, clearDraft, publish, edit, remove }), [isHydrated, recipes, drafts, storageError, saveDraft, clearDraft, publish, edit, remove]);
  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}
export function useRecipeVault() { const value = useContext(VaultContext); if (!value) throw new Error("useRecipeVault måste användas i RecipeVaultProvider."); return value; }

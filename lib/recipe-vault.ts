import { categories } from "@/lib/recipes";

export const DRAFT_STORAGE_KEY = "recept.phase2.drafts.v1";
export const LEGACY_RECIPE_STORAGE_KEY = "recept.phase2.recipes.v1";
export const LEGACY_DELETED_STORAGE_KEY = "recept.phase2.deleted.v1";

export type CanonicalRecipe = {
  id: string; slug: string; title: string; categorySlugs: string[];
  categoryNames: string[]; prepMinutes: number; archivedAt: string;
  note: string; context: string; ingredients: string[]; instructions: string[];
  deletedAt: string | null;
};
export type RecipeSummary = Omit<CanonicalRecipe, "ingredients" | "instructions">;
export type MergedRecipe = CanonicalRecipe;
export type RecipeDraft = Partial<Omit<CanonicalRecipe, "id" | "slug" | "archivedAt" | "categoryNames" | "deletedAt">>;

function storage(): Storage | null { if (typeof window === "undefined") return null; try { return window.localStorage; } catch { return null; } }
function readJson<T>(key: string, fallback: T): T { try { const value = storage()?.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function writeJson(key: string, value: unknown) { try { storage()?.setItem(key, JSON.stringify(value)); return Boolean(storage()); } catch { return false; } }
export function readDrafts(): Record<string, RecipeDraft> { const value = readJson<unknown>(DRAFT_STORAGE_KEY, {}); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, RecipeDraft> : {}; }
export function saveDraft(draft: RecipeDraft, key = "new") { return writeJson(DRAFT_STORAGE_KEY, { ...readDrafts(), [key]: draft }); }
export function clearDraft(key = "new") { const drafts = readDrafts(); delete drafts[key]; return writeJson(DRAFT_STORAGE_KEY, drafts); }
export function clearLegacyPublishedState() { try { const store = storage(); const hadData = Boolean(store?.getItem(LEGACY_RECIPE_STORAGE_KEY) || store?.getItem(LEGACY_DELETED_STORAGE_KEY)); store?.removeItem(LEGACY_RECIPE_STORAGE_KEY); store?.removeItem(LEGACY_DELETED_STORAGE_KEY); return hadData; } catch { return false; } }
export function categoryNamesFor(slugs: string[]) { return slugs.map((slug) => categories.find((category) => category.slug === slug)?.name ?? slug); }
export function validateRecipeDraft(draft: RecipeDraft): string[] { const errors: string[] = []; if (!draft.title?.trim()) errors.push("Titel krävs."); if (!draft.categorySlugs?.length) errors.push("Minst en kategori krävs."); if (!draft.prepMinutes || draft.prepMinutes < 1) errors.push("Förberedelsetid krävs."); if (!draft.ingredients?.some((item) => item.trim())) errors.push("Minst en ingrediens krävs."); if (!draft.instructions?.some((item) => item.trim())) errors.push("Minst ett instruktionsteg krävs."); return errors; }

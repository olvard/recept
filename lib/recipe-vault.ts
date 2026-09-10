import {
  categories,
  recipes,
  toCanonicalFixtureRecipe,
  type FixtureRecipe,
} from "@/lib/recipes";

export const RECIPE_STORAGE_KEY = "recept.phase2.recipes.v1";
export const DRAFT_STORAGE_KEY = "recept.phase2.drafts.v1";
export const DELETED_STORAGE_KEY = "recept.phase2.deleted.v1";

export type CanonicalRecipe = {
  id: string;
  title: string;
  categorySlugs: string[];
  categoryNames: string[];
  prepMinutes: number;
  archivedAt: string;
  note: string;
  context: string;
  ingredients: string[];
  instructions: string[];
};

export type RecipeDraft = Partial<Omit<CanonicalRecipe, "id" | "archivedAt" | "categoryNames">> & {
  id?: string;
};

export type LocalRecipe = CanonicalRecipe & { source: "local" };
export type MergedRecipe = CanonicalRecipe & { source: "fixture" | "overlay" | "local" };
export type FixtureRecipeOverlay = Partial<Omit<CanonicalRecipe, "id">> & { id: string };
export type LocalRecipeState = {
  version: 1;
  additions: LocalRecipe[];
  overlays: FixtureRecipeOverlay[];
};
export type DeletedFixtureIds = string[];
export type RecipeVaultState = {
  recipes: LocalRecipeState;
  deletedFixtureIds: DeletedFixtureIds;
};

const EMPTY_LOCAL_STATE: LocalRecipeState = { version: 1, additions: [], overlays: [] };

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const value: unknown = JSON.parse(store.getItem(key) ?? "null");
    return value === null ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function nonEmptyStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCanonicalRecipe(value: unknown): value is CanonicalRecipe {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Partial<CanonicalRecipe>;
  return typeof recipe.id === "string" && typeof recipe.title === "string" &&
    nonEmptyStrings(recipe.categorySlugs) && nonEmptyStrings(recipe.categoryNames) &&
    typeof recipe.prepMinutes === "number" && Number.isFinite(recipe.prepMinutes) &&
    typeof recipe.archivedAt === "string" && typeof recipe.note === "string" &&
    typeof recipe.context === "string" && nonEmptyStrings(recipe.ingredients) &&
    nonEmptyStrings(recipe.instructions);
}

function isLocalRecipeState(value: unknown): value is LocalRecipeState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<LocalRecipeState>;
  return state.version === 1 && Array.isArray(state.additions) &&
    state.additions.every(isLocalRecipe) &&
    Array.isArray(state.overlays) && state.overlays.every(isOverlay);
}

function isLocalRecipe(value: unknown): value is LocalRecipe {
  return isCanonicalRecipe(value) && (value as LocalRecipe).source === "local";
}

function isOverlay(value: unknown): value is FixtureRecipeOverlay {
  if (!value || typeof value !== "object" || typeof (value as FixtureRecipeOverlay).id !== "string") return false;
  const overlay = value as Record<string, unknown>;
  return Object.entries(overlay).every(([key, item]) => key === "id" ||
    (key === "categorySlugs" || key === "categoryNames" || key === "ingredients" || key === "instructions"
      ? nonEmptyStrings(item)
      : key === "prepMinutes" ? typeof item === "number" && Number.isFinite(item)
      : typeof item === "string"));
}

export function readLocalRecipeState(): LocalRecipeState {
  const value = readJson<unknown>(RECIPE_STORAGE_KEY, null);
  return isLocalRecipeState(value) ? value : { ...EMPTY_LOCAL_STATE, additions: [], overlays: [] };
}

export function readDeletedFixtureIds(): DeletedFixtureIds {
  const value = readJson<unknown>(DELETED_STORAGE_KEY, null);
  return Array.isArray(value) && value.every((id) => typeof id === "string") ? [...new Set(value)] : [];
}

export function readRecipeVaultState(): RecipeVaultState {
  return { recipes: readLocalRecipeState(), deletedFixtureIds: readDeletedFixtureIds() };
}

function categoryNamesFor(slugs: string[]) {
  return slugs.map((slug) => categories.find((category) => category.slug === slug)?.name ?? slug);
}

export function mergeRecipes(state: RecipeVaultState = readRecipeVaultState()): MergedRecipe[] {
  const deleted = new Set(state.deletedFixtureIds);
  const overlays = new Map(state.recipes.overlays.map((overlay) => [overlay.id, overlay]));
  const fixtureRecipes = recipes
    .filter((fixture) => !deleted.has(fixture.id))
    .map((fixture) => {
      const base = toCanonicalFixtureRecipe(fixture);
      const overlay = overlays.get(fixture.id);
      const merged = overlay ? { ...base, ...overlay } : base;
      return { ...merged, categoryNames: categoryNamesFor(merged.categorySlugs), source: overlay ? "overlay" as const : "fixture" as const };
    });
  return [...fixtureRecipes, ...state.recipes.additions.map((recipe) => ({ ...recipe, source: "local" as const }))].filter((recipe) => !deleted.has(recipe.id));
}

export function saveLocalRecipeState(state: LocalRecipeState): boolean {
  return writeJson(RECIPE_STORAGE_KEY, state);
}

export function saveRecipeOverlay(overlay: FixtureRecipeOverlay): boolean {
  const state = readLocalRecipeState();
  const overlays = [...state.overlays.filter((item) => item.id !== overlay.id), overlay];
  return saveLocalRecipeState({ ...state, overlays });
}

export function saveDeletedFixtureIds(ids: DeletedFixtureIds): boolean {
  return writeJson(DELETED_STORAGE_KEY, [...new Set(ids)]);
}

export function deleteFixtureRecipe(id: string): boolean {
  return saveDeletedFixtureIds([...readDeletedFixtureIds(), id]);
}

/** Creates a new local record only; publishing it is a separate, fallible step. */
export function createRecipeFromDraft(draft: RecipeDraft, state: RecipeVaultState = readRecipeVaultState()): LocalRecipe {
  const errors = validateRecipeDraft(draft);
  if (errors.length) throw new Error(errors.join(" "));
  return {
    id: getNextArchiveId(state), title: draft.title!.trim(),
    categorySlugs: [...draft.categorySlugs!], categoryNames: categoryNamesFor(draft.categorySlugs!),
    prepMinutes: draft.prepMinutes!, archivedAt: todayLocalDate(), note: draft.note?.trim() ?? "",
    context: draft.context?.trim() ?? "", ingredients: draft.ingredients!.map((item) => item.trim()).filter(Boolean),
    instructions: draft.instructions!.map((item) => item.trim()).filter(Boolean), source: "local",
  };
}

/** Keeps an existing archive number and date when an entry is edited. */
export function editRecipeFromDraft(existing: MergedRecipe | CanonicalRecipe, draft: RecipeDraft): MergedRecipe {
  const errors = validateRecipeDraft(draft);
  if (errors.length) throw new Error(errors.join(" "));
  return {
    ...existing, title: draft.title!.trim(), categorySlugs: [...draft.categorySlugs!],
    categoryNames: categoryNamesFor(draft.categorySlugs!), prepMinutes: draft.prepMinutes!,
    note: draft.note?.trim() ?? "", context: draft.context?.trim() ?? "",
    ingredients: draft.ingredients!.map((item) => item.trim()).filter(Boolean),
    instructions: draft.instructions!.map((item) => item.trim()).filter(Boolean),
  } as MergedRecipe;
}

/** Persists an already validated record and reports storage failures to the caller. */
export function persistRecipe(recipe: MergedRecipe | LocalRecipe, state: RecipeVaultState): boolean {
  if (recipes.some((fixture) => fixture.id === recipe.id)) {
    const overlay = { ...recipe };
    delete (overlay as Partial<typeof overlay>).source;
    return saveLocalRecipeState({ ...state.recipes, overlays: [...state.recipes.overlays.filter((item) => item.id !== recipe.id), overlay] });
  }
  const local: LocalRecipe = { ...recipe, source: "local" };
  return saveLocalRecipeState({ ...state.recipes, additions: [...state.recipes.additions.filter((item) => item.id !== recipe.id), local] });
}

export function deleteLocalRecipe(id: string, state: RecipeVaultState = readRecipeVaultState()): boolean {
  return saveLocalRecipeState({ ...state.recipes, additions: state.recipes.additions.filter((recipe) => recipe.id !== id) });
}

export function getNextArchiveId(state: RecipeVaultState = readRecipeVaultState()): string {
  const ids = mergeRecipes(state).map((recipe) => Number.parseInt(recipe.id, 10)).filter(Number.isFinite);
  const next = Math.max(0, ...ids) + 1;
  return String(next).padStart(3, "0");
}

function todayLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function validateRecipeDraft(draft: RecipeDraft): string[] {
  const errors: string[] = [];
  if (!draft.title?.trim()) errors.push("Titel krävs.");
  if (!draft.categorySlugs?.length) errors.push("Minst en kategori krävs.");
  if (!draft.prepMinutes || draft.prepMinutes < 1) errors.push("Förberedelsetid krävs.");
  if (!draft.ingredients?.some((item) => item.trim())) errors.push("Minst en ingrediens krävs.");
  if (!draft.instructions?.some((item) => item.trim())) errors.push("Minst ett instruktionsteg krävs.");
  return errors;
}

export function publishRecipeDraft(draft: RecipeDraft, state: RecipeVaultState = readRecipeVaultState()): LocalRecipe {
  const recipe = draft.id
    ? { ...createRecipeFromDraft({ ...draft, id: undefined }, state), id: draft.id }
    : createRecipeFromDraft(draft, state);
  if (recipes.some((fixture) => fixture.id === recipe.id)) {
    const overlay = Object.fromEntries(
      Object.entries(recipe).filter(([key]) => key !== "source"),
    ) as FixtureRecipeOverlay;
    if (!saveLocalRecipeState({
      ...state.recipes,
      overlays: [...state.recipes.overlays.filter((item) => item.id !== recipe.id), overlay],
    })) throw new Error("Kunde inte spara receptet i webbläsaren.");
  } else {
    const additions = state.recipes.additions.filter((item) => item.id !== recipe.id);
    if (!saveLocalRecipeState({ ...state.recipes, additions: [...additions, recipe] })) throw new Error("Kunde inte spara receptet i webbläsaren.");
  }
  return recipe;
}

export function readDrafts(): Record<string, RecipeDraft> {
  const value = readJson<unknown>(DRAFT_STORAGE_KEY, null);
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, RecipeDraft> : {};
}

export function saveDraft(draft: RecipeDraft, key = draft.id ?? "new"): boolean {
  return writeJson(DRAFT_STORAGE_KEY, { ...readDrafts(), [key]: draft });
}

export function clearDraft(key = "new"): boolean {
  const drafts = readDrafts();
  delete drafts[key];
  return writeJson(DRAFT_STORAGE_KEY, drafts);
}

// Named aliases keep the repository API easy to discover for its consumers.
export const getRecipeVaultState = readRecipeVaultState;
export const getMergedRecipes = mergeRecipes;
export const getNextRecipeId = getNextArchiveId;
export const markFixtureDeleted = deleteFixtureRecipe;
export const loadDraft = (key = "new") => readDrafts()[key];
export const removeDraft = clearDraft;

export function fixtureToCanonical(recipe: FixtureRecipe): CanonicalRecipe {
  return toCanonicalFixtureRecipe(recipe);
}

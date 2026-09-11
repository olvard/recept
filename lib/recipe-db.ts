import "server-only";
import { categoryNamesFor, type CanonicalRecipe, type RecipeDraft, type RecipeSummary, validateRecipeDraft } from "@/lib/recipe-vault";

type GitObject = { sha: string };
type GitCommit = { sha: string; tree: GitObject };
type Config = { owner: string; repo: string; branch: string; token: string };
export class RecipeDbError extends Error { constructor(message: string, public status = 500) { super(message); } }
const api = "https://api.github.com";
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const isDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function getRecipeDbConfig(): Config {
  const { GITHUB_RECIPE_DB_OWNER: owner, GITHUB_RECIPE_DB_REPO: repo, GITHUB_RECIPE_DB_BRANCH: branch = "main", GITHUB_RECIPE_DB_TOKEN: token } = process.env;
  if (!owner || !repo || !token) throw new RecipeDbError("Receptarkivet är inte konfigurerat.", 503);
  return { owner, repo, branch, token };
}
export function slugify(value: string) { return value.toLocaleLowerCase("sv").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "recept"; }
export function recipePath(recipe: Pick<CanonicalRecipe, "id" | "slug">) { return `recipes/${recipe.id}-${recipe.slug}.json`; }
export function toSummary(recipe: CanonicalRecipe): RecipeSummary { return { id: recipe.id, slug: recipe.slug, title: recipe.title, categorySlugs: recipe.categorySlugs, categoryNames: recipe.categoryNames, prepMinutes: recipe.prepMinutes, archivedAt: recipe.archivedAt, note: recipe.note, context: recipe.context, deletedAt: recipe.deletedAt }; }
export function sortIndex(recipes: RecipeSummary[]) { return [...recipes].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt) || Number(b.id) - Number(a.id)); }
export function generateIndex(recipes: CanonicalRecipe[]) { return sortIndex(recipes.filter((recipe) => !recipe.deletedAt).map(toSummary)); }
export function validateRecipe(value: unknown): CanonicalRecipe {
  if (!value || typeof value !== "object") throw new RecipeDbError("Ogiltig receptdata i arkivet.", 502);
  const recipe = value as Partial<CanonicalRecipe>;
  if (!/^\d{3,}$/.test(recipe.id ?? "") || typeof recipe.slug !== "string" || !recipe.slug || typeof recipe.title !== "string" || !recipe.title.trim() || !stringArray(recipe.categorySlugs) || !recipe.categorySlugs.length || !stringArray(recipe.categoryNames) || recipe.categoryNames.length !== recipe.categorySlugs.length || typeof recipe.prepMinutes !== "number" || !Number.isFinite(recipe.prepMinutes) || recipe.prepMinutes < 1 || !isDate(recipe.archivedAt) || typeof recipe.note !== "string" || typeof recipe.context !== "string" || !stringArray(recipe.ingredients) || !recipe.ingredients.length || !stringArray(recipe.instructions) || !recipe.instructions.length || !(recipe.deletedAt === null || typeof recipe.deletedAt === "string")) throw new RecipeDbError("Ogiltig receptdata i arkivet.", 502);
  return recipe as CanonicalRecipe;
}
export function validateSummary(value: unknown): RecipeSummary { const full = validateRecipe({ ...(value as object), ingredients: ["index"], instructions: ["index"] }); return toSummary(full); }
export function nextRecipeId(index: RecipeSummary[]) { return String(Math.max(0, ...index.map((recipe) => Number.parseInt(recipe.id, 10)).filter(Number.isFinite)) + 1).padStart(3, "0"); }

async function github(path: string, init: RequestInit = {}) {
  const config = getRecipeDbConfig();
  const response = await fetch(`${api}/repos/${config.owner}/${config.repo}${path}`, { ...init, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "X-GitHub-Api-Version": "2022-11-28", ...init.headers }, cache: "no-store" });
  if (!response.ok) throw new RecipeDbError(response.status === 404 ? "Receptet hittades inte." : "GitHub kunde inte läsa receptarkivet.", response.status === 404 ? 404 : response.status === 422 ? 422 : 502);
  return response.json() as Promise<unknown>;
}
async function content(path: string) { const raw = await github(`/contents/${path}?ref=${encodeURIComponent(getRecipeDbConfig().branch)}`) as { content: string; encoding: string }; if (raw.encoding !== "base64") throw new RecipeDbError("Ogiltigt svar från receptarkivet.", 502); try { return JSON.parse(Buffer.from(raw.content.replace(/\n/g, ""), "base64").toString("utf8")) as unknown; } catch { throw new RecipeDbError("Ogiltig JSON i receptarkivet.", 502); } }
export async function readIndex() { const raw = await content("index.json"); if (!Array.isArray(raw)) throw new RecipeDbError("Ogiltigt index i receptarkivet.", 502); return sortIndex(raw.map(validateSummary).filter((recipe) => !recipe.deletedAt)); }
export async function readRecipe(id: string) { const summary = (await readIndex()).find((item) => item.id === id); if (!summary) throw new RecipeDbError("Receptet hittades inte.", 404); return validateRecipe(await content(recipePath(summary))); }
function canonicalFromDraft(draft: RecipeDraft, id: string, previous?: CanonicalRecipe): CanonicalRecipe {
  const errors = validateRecipeDraft(draft); if (errors.length) throw new RecipeDbError(errors.join(" "), 400);
  const ingredients = draft.ingredients!.map((item) => item.trim()).filter(Boolean); const instructions = draft.instructions!.map((item) => item.trim()).filter(Boolean);
  return { id, slug: slugify(draft.title!.trim()), title: draft.title!.trim(), categorySlugs: [...draft.categorySlugs!], categoryNames: categoryNamesFor(draft.categorySlugs!), prepMinutes: draft.prepMinutes!, archivedAt: previous?.archivedAt ?? new Date().toISOString().slice(0, 10), note: draft.note?.trim() ?? "", context: draft.context?.trim() ?? ingredients.slice(0, 3).join(" · "), ingredients, instructions, deletedAt: previous?.deletedAt ?? null };
}
async function commit(recipe: CanonicalRecipe, oldPath?: string) {
  const config = getRecipeDbConfig(); const head = await github(`/git/ref/heads/${encodeURIComponent(config.branch)}`) as { object: GitObject }; const commit = await github(`/git/commits/${head.object.sha}`) as GitCommit;
  const index = await readIndex(); const nextIndex = generateIndex([...(index.filter((item) => item.id !== recipe.id).map((summary) => ({ ...summary, ingredients: ["index"], instructions: ["index"] } as CanonicalRecipe))), recipe]);
  const recipeBlob = await github("/git/blobs", { method: "POST", body: JSON.stringify({ content: JSON.stringify(recipe, null, 2) + "\n", encoding: "utf-8" }) }) as GitObject;
  const indexBlob = await github("/git/blobs", { method: "POST", body: JSON.stringify({ content: JSON.stringify(nextIndex, null, 2) + "\n", encoding: "utf-8" }) }) as GitObject;
  const treeItems: Array<{ path: string; mode: string; type: string; sha: string | null }> = [{ path: recipePath(recipe), mode: "100644", type: "blob", sha: recipeBlob.sha }, { path: "index.json", mode: "100644", type: "blob", sha: indexBlob.sha }]; if (oldPath && oldPath !== recipePath(recipe)) treeItems.push({ path: oldPath, mode: "100644", type: "blob", sha: null });
  const tree = await github("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: treeItems }) }) as GitObject;
  const newCommit = await github("/git/commits", { method: "POST", body: JSON.stringify({ message: `${recipe.deletedAt ? "Ta bort" : "Spara"} recept #${recipe.id}`, tree: tree.sha, parents: [head.object.sha] }) }) as GitObject;
  try { await github(`/git/refs/heads/${encodeURIComponent(config.branch)}`, { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha, force: false }) }); } catch (error) { if (error instanceof RecipeDbError && error.status === 422) throw new RecipeDbError("CONFLICT", 409); throw error; }
  return { recipe, index: nextIndex };
}
export async function writeRecipe(draft: RecipeDraft, id?: string) { for (let attempt = 0; attempt < 3; attempt++) { const index = await readIndex(); let previous: CanonicalRecipe | undefined; if (id) previous = await readRecipe(id); const recipe = canonicalFromDraft(draft, id ?? nextRecipeId(index), previous); try { return await commit(recipe, previous && recipePath(previous)); } catch (error) { if (error instanceof RecipeDbError && error.message === "CONFLICT") continue; throw error; } } throw new RecipeDbError("Receptet kunde inte sparas efter flera försök.", 409); }
export async function softDeleteRecipe(id: string) { for (let attempt = 0; attempt < 3; attempt++) { const previous = await readRecipe(id); try { return await commit({ ...previous, deletedAt: new Date().toISOString() }, recipePath(previous)); } catch (error) { if (error instanceof RecipeDbError && error.message === "CONFLICT") continue; throw error; } } throw new RecipeDbError("Receptet kunde inte tas bort efter flera försök.", 409); }

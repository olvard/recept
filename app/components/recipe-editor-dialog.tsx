"use client";

import { useEffect, useRef, useState } from "react";
import { categories } from "@/lib/recipes";
import { validateRecipeDraft, type MergedRecipe, type RecipeDraft } from "@/lib/recipe-vault";
import { useRecipeVault } from "@/app/components/recipe-vault-provider";

const emptyDraft = (): RecipeDraft => ({ title: "", categorySlugs: [], prepMinutes: undefined, note: "", context: "", ingredients: [""], instructions: [""] });
const fromRecipe = (recipe: MergedRecipe): RecipeDraft => ({ title: recipe.title, categorySlugs: recipe.categorySlugs, prepMinutes: recipe.prepMinutes, note: recipe.note, context: recipe.context, ingredients: recipe.ingredients, instructions: recipe.instructions });
const contextFromIngredients = (ingredients: string[] = []) => ingredients.map((item) => item.trim()).filter(Boolean).slice(0, 3).join(" · ");

export function RecipeEditorDialog({ mode, recipe, onClose, onSaved }: { mode: "create" | "edit"; recipe?: MergedRecipe; onClose: () => void; onSaved: (recipe: MergedRecipe) => void }) {
  const { drafts, saveDraft, clearDraft, publish, edit, storageError } = useRecipeVault();
  const key = mode === "create" ? "new" : recipe!.id;
  const [draft, setDraft] = useState<RecipeDraft>(() => drafts[key] ?? (recipe ? fromRecipe(recipe) : emptyDraft()));
  const [errors, setErrors] = useState<string[]>([]);
  const dialogRef = useRef<HTMLElement>(null); const firstField = useRef<HTMLInputElement>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft); const shouldPersistOnUnmount = useRef(true);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const commitDraft = (next = draftRef.current) => saveDraft(key, next);
  useEffect(() => { firstField.current?.focus(); return () => { if (timer.current) clearTimeout(timer.current); if (shouldPersistOnUnmount.current) saveDraft(key, draftRef.current); }; }, [key, saveDraft]);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commitDraft(draft), 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { commitDraft(); onClose(); }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown); return () => document.removeEventListener("keydown", onKeyDown);
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (changes: Partial<RecipeDraft>) => { const next = { ...draft, ...changes }; setDraft(next); if (errors.length) setErrors(validateRecipeDraft(next)); };
  const rows = (field: "ingredients" | "instructions", label: string) => <fieldset className="editor-rows"><legend>{label}</legend>{(draft[field] ?? [""]).map((value, index) => <div className="editor-row" key={`${field}-${index}`}><input aria-label={`${label} ${index + 1}`} value={value} onChange={(event) => { const values = [...(draft[field] ?? [])]; values[index] = event.target.value; update({ [field]: values }); }} />{(draft[field]?.length ?? 0) > 1 && <button className="text-button" type="button" onClick={() => update({ [field]: draft[field]!.filter((_, row) => row !== index) })}>Ta bort</button>}</div>)}<button className="text-button" type="button" onClick={() => update({ [field]: [...(draft[field] ?? []), ""] })}>+ Lägg till rad</button></fieldset>;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const draftToSave = { ...draft, context: contextFromIngredients(draft.ingredients) };
    const nextErrors = validateRecipeDraft(draftToSave); setErrors(nextErrors);
    if (nextErrors.length) {
      const target = nextErrors[0].startsWith("Kategori") ? "input[type=checkbox]" : nextErrors[0].startsWith("Förberedelsetid") ? "#recipe-prep" : nextErrors[0].startsWith("ingrediens") ? '[aria-label="Ingredienser 1"]' : nextErrors[0].startsWith("instruktion") ? '[aria-label="Gör så här 1"]' : "#recipe-title";
      dialogRef.current?.querySelector<HTMLElement>(target)?.focus(); return;
    }
    const saved = mode === "create" ? publish(draftToSave) : edit(recipe!.id, draftToSave);
    if (!saved) return;
    shouldPersistOnUnmount.current = !clearDraft(key);
    onSaved(saved);
  };
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { commitDraft(); onClose(); } }}>
    <section className="dialog editor-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="recipe-editor-title">
      <button className="dialog-close" type="button" aria-label="Stäng receptformuläret" onClick={() => { commitDraft(); onClose(); }}>×</button>
      <p className="eyebrow">{mode === "create" ? "Nytt recept" : `Redigera #${recipe!.id}`}</p><h2 id="recipe-editor-title">{mode === "create" ? "Lägg till i Recept" : "Redigera recept"}</h2>
      <form onSubmit={submit} noValidate><div className="editor-fields"><div><label htmlFor="recipe-title">Titel</label><input ref={firstField} id="recipe-title" value={draft.title ?? ""} onChange={(event) => update({ title: event.target.value })} /></div>
        <fieldset><legend>Kategorier</legend><div className="category-checks">{categories.map((category) => <label key={category.slug}><input type="checkbox" checked={draft.categorySlugs?.includes(category.slug) ?? false} onChange={(event) => update({ categorySlugs: event.target.checked ? [...(draft.categorySlugs ?? []), category.slug] : (draft.categorySlugs ?? []).filter((slug) => slug !== category.slug) })} /> {category.name}</label>)}</div></fieldset>
        <div><label htmlFor="recipe-prep">Förberedelsetid (minuter)</label><input id="recipe-prep" type="text" inputMode="numeric" pattern="[0-9]*" value={draft.prepMinutes ?? ""} onKeyDown={(event) => { if (["e", "E", "+", "-", ".", ","].includes(event.key)) event.preventDefault(); }} onChange={(event) => { const digits = event.target.value.replace(/\D/g, ""); update({ prepMinutes: digits ? Number(digits) : undefined }); }} /></div>
        <div><label htmlFor="recipe-note">Beskrivning</label><textarea id="recipe-note" value={draft.note ?? ""} onChange={(event) => update({ note: event.target.value })} /></div>{rows("ingredients", "Ingredienser")}<div className="context-preview"><span className="field-label">Kontexttaggar</span><p>{contextFromIngredients(draft.ingredients) || "Fyll i ingredienser för att skapa taggar."}</p><small>De tre första ingredienserna används som taggar.</small></div>{rows("instructions", "Gör så här")}</div>
        {errors.length > 0 && <div className="form-errors" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}{storageError && <p className="form-errors" role="alert">{storageError}</p>}
        <div className="dialog-actions"><button className="text-button" type="button" onClick={() => { commitDraft(); onClose(); }}>Avbryt</button><button className="button" type="submit">{mode === "create" ? "Publicera recept" : "Spara ändringar"}</button></div></form>
    </section>
  </div>;
}

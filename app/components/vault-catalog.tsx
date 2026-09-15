"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { categories } from "@/lib/recipes";
import { useRecipeVault } from "@/app/components/recipe-vault-provider";

const perPage = 6;
const prepOptions = [
  ["all", "Alla"], ["15", "≤15 min"], ["16-30", "16–30 min"], ["31-45", "31–45 min"], ["46-60", "46–60 min"], ["60", "Över 1 tim"],
] as const;
const sortOptions = [["recent", "Senast arkiverade"], ["archive", "Arkivnummer"], ["alpha", "Alfabetiskt"]] as const;
const archiveMonths = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatArchiveDate(value: string) {
  const [year, month, day] = value.split("-");
  const monthName = archiveMonths[Number(month) - 1];
  return monthName ? `${day} ${monthName} ${year}` : value;
}

function matchesPrep(minutes: number, prep: string) {
  if (prep === "15") return minutes <= 15;
  if (prep === "16-30") return minutes >= 16 && minutes <= 30;
  if (prep === "31-45") return minutes >= 31 && minutes <= 45;
  if (prep === "46-60") return minutes >= 46 && minutes <= 60;
  if (prep === "60") return minutes > 60;
  return true;
}

export function VaultCatalog() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { recipes } = useRecipeVault();
  const q = params.get("q") ?? "";
  const selectedCategories = params.getAll("category").filter((slug) => categories.some((item) => item.slug === slug));
  const rawPrep = params.get("prep") ?? "all";
  const prep = prepOptions.some(([value]) => value === rawPrep) ? rawPrep : "all";
  const rawSort = params.get("sort") ?? "recent";
  const sort = sortOptions.some(([value]) => value === rawSort) ? rawSort : "recent";
  const requestedPage = Number(params.get("page") ?? "1");

  const filtered = recipes.filter((recipe) => {
    const needle = q.trim().toLocaleLowerCase("sv");
    const haystack = [recipe.title, recipe.note, ...recipe.contextTags].join(" ").toLocaleLowerCase("sv");
    return (!needle || haystack.includes(needle)) && (!selectedCategories.length || selectedCategories.some((slug) => recipe.categorySlugs.includes(slug))) && matchesPrep(recipe.prepMinutes, prep);
  }).sort((a, b) => {
    if (sort === "alpha") return a.title.localeCompare(b.title, "sv");
    if (sort === "archive") return Number(a.id) - Number(b.id);
    return b.archivedAt.localeCompare(a.archivedAt);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  const update = (changes: Record<string, string | string[] | null>, replace = false) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) => {
      next.delete(key);
      if (!value || value === "all" || (key === "sort" && value === "recent")) return;
      if (Array.isArray(value)) value.forEach((item) => next.append(key, item)); else next.set(key, value);
    });
    const url = next.size ? `${pathname}?${next}` : pathname;
    if (replace) router.replace(url, { scroll: false }); else router.push(url, { scroll: false });
  };
  const updateFilter = (changes: Record<string, string | string[]>, replace = false) => update({ ...changes, page: null }, replace);
  const reset = () => router.push("/vault", { scroll: false });
  const counts = Object.fromEntries(categories.map((category) => [category.slug, recipes.filter((recipe) => recipe.categorySlugs.includes(category.slug)).length]));
  const toggleCategory = (slug: string) => updateFilter({ category: selectedCategories.includes(slug) ? selectedCategories.filter((item) => item !== slug) : [...selectedCategories, slug] });

  return <div className="page-wrap vault-page">
    <h1 className="sr-only">Receptarkiv</h1>
    <section className="controls" aria-label="Sök och filtrera recept">
      <div className="search-field"><label htmlFor="search">Sök recept</label><div className="search-input"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg><input id="search" type="search" value={q} placeholder="Sök recept…" onChange={(e) => updateFilter({ q: e.target.value }, true)} /></div></div>
      <button className="filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="filter-options" onClick={() => setFiltersOpen((open) => !open)}>Filtrera och sortera <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span></button>
      <div id="filter-options" className={`filter-options${filtersOpen ? " is-open" : ""}`}>
        <fieldset className="category-chips"><legend>Kategorier</legend><button type="button" className={selectedCategories.length === 0 ? "selected" : ""} aria-pressed={selectedCategories.length === 0} onClick={() => updateFilter({ category: [] })}>Alla <span>{recipes.length.toString().padStart(2, "0")}</span></button>{categories.map((item) => <button type="button" className={selectedCategories.includes(item.slug) ? "selected" : ""} aria-pressed={selectedCategories.includes(item.slug)} key={item.slug} onClick={() => toggleCategory(item.slug)}>{item.name} <span>{String(counts[item.slug]).padStart(2, "0")}</span></button>)}</fieldset>
        <div className="select-field sort-field"><label htmlFor="sort">Sortera</label><select id="sort" value={sort} onChange={(e) => updateFilter({ sort: e.target.value })}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="select-field prep-field"><label htmlFor="prep">Tid</label><select id="prep" value={prep} onChange={(e) => updateFilter({ prep: e.target.value })}>{prepOptions.map(([value, label]) => <option key={value} value={value}>{value === "all" ? "Tid: valfri" : label}</option>)}</select></div>
        <button className="text-button clear-button" type="button" onClick={reset}>Rensa filter</button>
      </div>
    </section>
    <p className="sr-only" aria-live="polite">{filtered.length} {filtered.length === 1 ? "recept" : "recept"} hittades. Sida {page} av {totalPages} visas.</p>
    {visible.length ? <><ul className="recipe-list" aria-label="Receptposter">{visible.map((recipe) => <li key={recipe.id}>
      <Link className="recipe-row" href={`/recipes/${recipe.id}`}>
        <span className="recipe-rank">{recipe.id}</span>
        <span className="recipe-main">
          <span className="recipe-title-line"><span className="recipe-title">{recipe.title}</span></span>
          {recipe.note && <span className="recipe-note">{recipe.note}</span>}
          <span className="recipe-meta"><span className="category">{recipe.categoryNames.join(" · ")}</span><span>{recipe.prepMinutes} min</span><span>Arkiverad {formatArchiveDate(recipe.archivedAt)}</span><span className="recipe-context">{recipe.contextTags.join(" · ")}</span></span>
        </span>
        <span className="row-arrow" aria-hidden="true">→</span>
      </Link>
    </li>)}</ul>
      <nav className="pagination" aria-label="Sidindelning"><button type="button" disabled={page === 1} onClick={() => update({ page: String(page - 1) })}>← Föregående</button><span aria-live="polite">Sida {page} av {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => update({ page: String(page + 1) })}>Nästa →</button></nav></> : <section className="no-results"><h2>Inga recept matchar din sökning</h2><p>Prova en annan sökning eller återställ indexet.</p><button className="button" type="button" onClick={reset}>Rensa filter</button></section>}
  </div>;
}

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { categories, recipes } from "@/lib/recipes";
import { NewPostButton } from "@/app/components/new-post-button";

const perPage = 4;
const prepOptions = [
  ["all", "Alla"], ["15", "≤15 min"], ["16-30", "16–30 min"], ["31-45", "31–45 min"], ["46-60", "46–60 min"], ["60", "Över 1 tim"],
] as const;
const sortOptions = [["recent", "Senast arkiverade"], ["archive", "Arkivnummer"], ["alpha", "Alfabetiskt"]] as const;

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
  const q = params.get("q") ?? "";
  const rawCategory = params.get("category") ?? "all";
  const category = categories.some((item) => item.slug === rawCategory) ? rawCategory : "all";
  const rawPrep = params.get("prep") ?? "all";
  const prep = prepOptions.some(([value]) => value === rawPrep) ? rawPrep : "all";
  const rawSort = params.get("sort") ?? "recent";
  const sort = sortOptions.some(([value]) => value === rawSort) ? rawSort : "recent";
  const requestedPage = Number(params.get("page") ?? "1");

  const filtered = recipes.filter((recipe) => {
    const needle = q.trim().toLocaleLowerCase("sv");
    const haystack = [recipe.title, recipe.note, recipe.context, ...recipe.ingredients].join(" ").toLocaleLowerCase("sv");
    return (!needle || haystack.includes(needle)) && (category === "all" || recipe.categorySlug === category) && matchesPrep(recipe.prepMinutes, prep);
  }).sort((a, b) => {
    if (sort === "alpha") return a.title.localeCompare(b.title, "sv");
    if (sort === "archive") return Number(a.id) - Number(b.id);
    return b.archivedAt.localeCompare(a.archivedAt);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  const update = (changes: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "sort" && value === "recent")) next.delete(key);
      else next.set(key, value);
    });
    const url = next.size ? `${pathname}?${next}` : pathname;
    if (replace) router.replace(url, { scroll: false }); else router.push(url, { scroll: false });
  };
  const updateFilter = (changes: Record<string, string>, replace = false) => update({ ...changes, page: null }, replace);
  const reset = () => router.push("/vault", { scroll: false });

  return <div className="page-wrap vault-page">
    <section className="page-intro"><p className="eyebrow">Personligt arkiv · 8 recept</p><div className="page-intro-title-row"><h1>Recept</h1><NewPostButton /></div><p>Oliver & Wilmas receptsamling.</p></section>
    <section className="controls" aria-label="Sök och filtrera recept">
      <div className="search-field"><label htmlFor="search">Sök i arkivet</label><input id="search" type="search" value={q} placeholder="Till exempel morot eller citron" onChange={(e) => updateFilter({ q: e.target.value }, true)} /></div>
      <button className="filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="filter-options" onClick={() => setFiltersOpen((open) => !open)}>Filter {filtersOpen ? "−" : "+"}</button>
      <div id="filter-options" className={`filter-options${filtersOpen ? " is-open" : ""}`}>
        <div className="select-field"><label htmlFor="category">Kategori</label><select id="category" value={category} onChange={(e) => updateFilter({ category: e.target.value })}><option value="all">Alla</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
        <div className="select-field"><label htmlFor="prep">Förberedelsetid</label><select id="prep" value={prep} onChange={(e) => updateFilter({ prep: e.target.value })}>{prepOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="select-field"><label htmlFor="sort">Sortera</label><select id="sort" value={sort} onChange={(e) => updateFilter({ sort: e.target.value })}>{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <button className="text-button clear-button" type="button" onClick={reset}>Rensa</button>
      </div>
    </section>
    <p className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "recept" : "recept"} i arkivet</p>
    {visible.length ? <><section className="recipe-grid" aria-label="Receptposter">{visible.map((recipe) => <article className="recipe-card" key={recipe.id}>
      <p className="archive-line">#{recipe.id} · {recipe.category} · {recipe.prepMinutes} min</p><h2>{recipe.title}</h2>{recipe.note && <p className="note">{recipe.note}</p>}<div className="card-bottom"><p className="context">{recipe.context}</p><Link className="open-link" href={`/recipes/${recipe.id}`}>Öppna <span aria-hidden="true">→</span></Link></div>
    </article>)}</section>
      <nav className="pagination" aria-label="Sidindelning"><button type="button" disabled={page === 1} onClick={() => update({ page: String(page - 1) })}>← Föregående</button><span aria-live="polite">Sida {page} av {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => update({ page: String(page + 1) })}>Nästa →</button></nav></> : <section className="no-results"><h2>Inga recept matchar din sökning</h2><p>Prova en annan sökning eller återställ indexet.</p><button className="button" type="button" onClick={reset}>Rensa filter</button></section>}
  </div>;
}

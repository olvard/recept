# Personal Recipe Vault — Implementation-Ready PRD

## 1. Product definition

**Product name:** Recept  
**Vision:** A quiet, durable, private culinary ledger for recording and referencing personal recipes.  
**Primary MVP success criterion:** The interface feels like a calm, credible digital kitchen ledger.

The MVP is a polished, static prototype. It uses local fixture data and does not implement authentication, GitHub storage, encryption, persistence, recipe creation, or offline storage.

## 2. MVP scope

The MVP includes:

- Mobile-first responsive Vault catalog.
- Desktop and mobile application shells.
- Eight generated Swedish recipes using practical, seasonal Nordic home cooking.
- Working search, category filtering, prep-time filtering, sorting, pagination, URL state, category collections, and recipe detail routes.
- Read-only recipe detail pages.
- A placeholder `+ Ny post` modal for the Phase 2 entry flow.
- Static export and deployment to Vercel or an equivalent standard host.

Recipe imagery is excluded. The visual system is validated through typography, spacing, borders, hierarchy, and archival metadata.

## 3. Content and taxonomy

The UI and recipe content are Swedish. `Recept` is the sole visible wordmark.

The fixture contains eight recipes distributed as:

- 3 `Lunch`
- 3 `Middag`
- 2 `Matlådor`

Each recipe belongs to exactly one category in the MVP. The data model should remain easy to extend to multiple categories later.

Use Swedish metric measurements: grams, millilitres, decilitres, Celsius, tablespoons, and teaspoons as appropriate.

## 4. Application shell

### Desktop

- Top bar with `Recept` wordmark, `Vault`, `Kategorier`, fixed profile attribution, and `+ Ny post`.
- Footer label: `Arkiverad · Filed 2026`.

### Mobile

- Header with `Recept` and compact attribution.
- Bottom navigation with `Vault` and `Kategorier`.

Use one primary responsive breakpoint around 768px, with fluid sizing within each layout.

Fixed attribution values:

- Username: `Oliver`
- Version: `V.1`
- Count: `8 arkiverade recept`

`+ Ny post` opens a modal containing `Ny post kommer i fas 2` and a `Stäng` action. The modal closes through the close button, `Escape`, and outside click/tap.

## 5. Vault catalog

The default route is `/vault`.

Each archival card contains:

- Archive index and category, such as `#048 · Middag · 25 min`.
- Recipe title.
- Short formulation note.
- Ingredients/technique context.
- Category link.
- Text-led `Öppna →` action.

Show four recipes per page, producing two functional pages. Pagination displays the current page and total pages, and changes reset to page 1 whenever search, category, prep-time, or sort changes.

### Search

Search is case-insensitive and matches partial text across title, ingredients, and formulation note. It filters on every keystroke. URL updates replace the current history entry while typing.

### Filters

Keep search and both filter controls visible on mobile and desktop. Filters are:

- `Kategori`: `Alla`, `Lunch`, `Middag`, `Matlådor`
- `Förberedelsetid`: `Alla`, `≤15 min`, `16–30 min`, `31–45 min`, `46–60 min`, `Över 1 tim`

Include a working `Rensa` action that restores the complete index.

### Sorting

Default to `Senast arkiverade`. Provide working alternatives for `Arkivnummer` and `Alfabetiskt`. Generate deterministic dates and archive IDs for the fixture.

### URL state

All catalog state is shareable through query parameters:

`/vault?q=morot&category=middag&prep=16-30&sort=recent&page=2`

Use stable lowercase slugs for query values. Deliberate filter, sort, and pagination changes create browser history entries. Invalid or empty combinations resolve safely to the first valid page.

The no-results state says `Inga poster matchar din sökning` and includes a working `Rensa filter` action.

## 6. Categories

`/kategorier` displays three selectable collection cards for `Lunch`, `Middag`, and `Matlådor`, each with a recipe count. Each card links to the corresponding filtered Vault URL, for example `/vault?category=middag`.

## 7. Recipe details

Each recipe has a statically generated route at `/recipes/[id]`.

The read-only page contains:

- Breadcrumbs: `Vault / Kategori / Recept`.
- Title and metadata.
- Ingredients as a simple list of quantity-plus-name lines.
- Instructions as numbered, separately spaced steps.
- Persistent application shell navigation.

There are no checkboxes, ratio scaling, markdown entry flow, or cook-mode behavior in the MVP. Invalid recipe URLs show a branded Swedish static 404 page with a link back to `Vault`.

## 8. Design system

- Canvas: `#fff8f6`.
- Primary terracotta accent/headings: `#d44625`.
- Darker ink for body text and controls: `#a93115`.
- Supporting moss: `#2f5d50`.
- Paper container: `#ffffff` or `#fff1ed`.
- Sharp corners (`border-radius: 0`).
- Solid 1px/2px borders.
- No shadows or gradients.
- Generous whitespace and immediately visible discovery controls.

Use one self-hosted `Syne Mono` weight and two self-hosted `Inter` weights. The 50 kB compressed initial-bundle target applies to JavaScript/CSS and excludes font payloads.

## 9. Technical requirements

- Store the fixture in a local JSON file, separate from UI code.
- Use static generation for all eight recipe routes.
- Configure Next.js static export (`output: 'export'`) with no server runtime.
- Keep search, filtering, sorting, pagination, and modal behavior client-side.
- Use semantic HTML, keyboard navigation, visible focus rings, accessible labels, and sensible screen-reader announcements. Formal WCAG 2.2 AA verification is not a release blocker, but core accessibility checks are required.

## 10. Browser support

Support the latest Chrome and Safari on desktop and mobile, including iOS Safari and Android Chrome.

## 11. Verification and release gate

Deployment is blocked until all automated checks pass, including:

- Production build and static export.
- Generation and loading of every recipe route.
- Search, category, prep-time, sorting, pagination, URL-state, and reset logic.
- Core accessibility behavior.

## 12. Roadmap

### Phase 2 — Recipe detail and entry flows

Expand detail pages with scalable ingredient ratios, step-by-step prep checklist, and a `+ Ny post` flow with markdown culinary notes.

### Phase 3 — Notebook organization and offline storage

Add custom category management, multi-category assignment, open-format export (JSON, plain text, printable PDF), and offline/local encrypted storage.

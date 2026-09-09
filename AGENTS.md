<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository guide

### Product and scope

- This is **Recept**, a Swedish, static personal recipe-vault MVP.
- The site is a polished, read-only prototype: do not add authentication, persistence, APIs, recipe editing, image optimization, or external data fetching unless the task explicitly asks for it.
- Keep UI copy in Swedish. `Recept` is the wordmark; use the established product vocabulary (`Vault`, `Kategorier`, `Nytt recept`).

### Architecture

- The project uses the App Router and `output: "export"` in `next.config.ts`. All changes must remain compatible with a static export; do not introduce server-only runtime dependencies.
- `app/layout.tsx` supplies the site-wide `AppShell` from `app/components/app-shell.tsx`.
- Route map:
  - `/` redirects to `/vault`.
  - `/vault` is the catalog page. Keep `app/vault/page.tsx` as the server wrapper with a `Suspense` boundary around the client catalog.
  - `/kategorier` is a static category collection page.
  - `/recipes/[id]` is statically generated from fixture IDs via `generateStaticParams`; retain `dynamicParams = false`.
  - `app/not-found.tsx` provides the branded Swedish 404 state.
- `app/components/vault-catalog.tsx` is a Client Component. It owns all client-only catalog behavior: query-string state, search, filtering, sorting, pagination, and the mobile filter disclosure.
- `app/components/app-shell.tsx` is a Client Component because it owns pathname-aware navigation and the `Nytt recept` modal. Keep its Escape and outside-click close behavior intact.

### Data

- Recipe fixtures live only in `data/recipes.json`; do not duplicate recipe content in UI components.
- Import fixtures and taxonomy through `lib/recipes.ts`. It defines the `Recipe` type, category list, and recipe lookup helper.
- Fixture IDs are two-digit archive numbers. The MVP has eight recipes: 3 `Lunch`, 3 `Middag`, and 2 `Matlådor`. Preserve this distribution unless intentionally changing the fixture scope.
- Recipe detail URLs use IDs (`/recipes/048`); category query values use stable lowercase slugs such as `middag` and `matlador`.

### UI and interaction rules

- The visual system is defined in `app/globals.css`: warm canvas, terracotta headings/accent, moss metadata, paper surfaces, square corners, solid borders, and no gradients or shadows.
- Keep the interface mobile-first and preserve the `767px` application-shell breakpoint. On mobile, search stays visible while the extra catalog filters are collapsed by default; `Nytt recept` stays available in the header.
- Preserve semantic landmarks, visible focus styles, associated form labels, `aria-live` result feedback, and accessible dialog semantics.
- Do not add third-party UI/component libraries for this small static app.

### URL-state conventions

- `/vault` supports `q`, `category`, `prep`, `sort`, and `page` query parameters.
- Search updates use `router.replace`; intentional filters, sorting, reset, and pagination use `router.push`.
- Filter/sort changes reset pagination. Treat invalid query values and out-of-range pages safely by resolving them to valid defaults.

### Validation

- Run `npx tsc --noEmit` and `npm run lint` for implementation changes.
- Run `npx next build --webpack` to verify the static production export and all generated recipe routes. In this workspace, the default Turbopack build may fail because its CSS worker cannot bind a port; use the Webpack command as the reliable release check.

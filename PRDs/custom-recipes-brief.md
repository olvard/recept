# Recept — Phase 2 PRD

## 1. Product Definition

**Product:** Recept — Personal Recipe Vault  
**Phase:** 2 — create and manage recipes  
**Status:** Decided direction for implementation

Phase 2 extends the static, readable recipe prototype with a local workflow for creating, editing, and deleting recipes. Recipe data is saved in the user's browser and does not leave the device.

The existing archive feel, Swedish UI copy, and static export model must be preserved.

## 2. Goals

- The user must be able to create a complete recipe from `Nytt recept`.
- The user must be able to edit existing fixture recipes and local recipes.
- The user must be able to delete recipes with a clear confirmation step.
- Drafts must be autosaved locally so interrupted work can be resumed.
- Local recipes must survive reloads and browser restarts.
- The solution must continue to work with Next.js `output: "export"` and static hosting.

## 3. Non-goals

The following are not included in Phase 2:

- Backend, API, or cloud database.
- Login or user accounts.
- Synchronization between devices or browsers.
- Image uploads or recipe images.
- Encryption or offline functionality beyond the browser's local storage.
- Recipe import/export.
- Custom categories.
- Cook mode, serving scaling, or checklists.
- Markdown editor.

## 4. Storage and Data Lifecycle

### 4.1 Storage Model

Use `localStorage` as the primary storage mechanism for Phase 2.

- Fixture data in `data/recipes.json` must remain the source for the eight original recipes.
- User changes must be saved as local overlays; the fixture file must never be mutated from the client.
- New recipes, edits, deletions, and drafts must be stored locally.
- All reads from `localStorage` must happen client-side after hydration.
- If storage is missing, corrupt, or cannot be parsed, the app must fall back to fixture data and show a recoverable error.

Recommended keys:

- `recept.phase2.recipes.v1` — published local recipes and changes.
- `recept.phase2.drafts.v1` — autosaved drafts.
- `recept.phase2.deleted.v1` — fixture IDs that the user has deleted.

A version-prefixed storage key must be used so future data migrations can be introduced without silently losing existing data.

### 4.2 Publishing and Drafts

- A new recipe is saved as a draft while the user is writing.
- Autosave occurs with a debounce after changes.
- A draft does not receive a permanent archive number until it is published.
- Upon publishing, an archive number and archive date are generated automatically.
- A published recipe is removed from draft storage.
- If the user leaves the form, an existing draft must be resumable.

### 4.3 Archive Metadata

- Archive numbers are generated automatically and must be unique among fixture recipes, local recipes, and remaining history.
- The format must follow the existing two-digit archive numbers where possible, for example `#049` after `#048`.
- Archive dates are generated upon publishing and used by the `Senast arkiverade` sort order.
- The user must not need to enter or edit these values in the form.

## 5. Recipe Form

### 5.1 Required Fields

The following fields are required for publishing:

- Title.
- At least one category.
- Preparation time.
- At least one ingredient row.
- At least one instruction step.

The form may also include:

- A short description or introduction.
- Ingredient quantity and name.
- Instruction text.
- Optional metadata fields that follow the existing recipe model.

### 5.2 Categories

A recipe can belong to multiple categories. Phase 2 must support the existing categories:

- `Lunch` (`lunch`)
- `Middag` (`middag`)
- `Matlådor` (`matlador`)

At least one category is required for publishing. Category filters and category pages must include the recipe in every selected category.

### 5.3 Validation

Validation must occur both inline and upon publishing.

- Inline feedback is shown after a field has been touched or changed.
- Publishing is blocked if required fields are missing or contain invalid values.
- Error messages must be in Swedish and associated with the correct form fields.
- Focus must move to the first invalid field after an unsuccessful publishing attempt.
- Drafts may be incomplete and must be savable without publishing validation.

## 6. User Flows

### 6.1 Create a Recipe

1. The user selects `Nytt recept` in the application shell.
2. An accessible recipe form opens.
3. The form autosaves a local draft.
4. The user selects `Publicera` once validation passes.
5. The recipe receives an archive number and archive date automatically.
6. The user is sent to the new client-based detail view.

### 6.2 Edit a Recipe

- Existing fixture recipes and local recipes must be editable.
- Editing creates a local overlay for the fixture recipe.
- The original data in `data/recipes.json` must remain available as a recoverable base.
- The form must clearly indicate whether the user is editing a draft or a published recipe.

### 6.3 Delete a Recipe

- `Ta bort recept` must require confirmation in an accessible dialog.
- The dialog must clearly show which recipe is being deleted.
- Upon confirmation, local recipes are deleted and fixture recipes are marked as locally deleted.
- Cancel must leave the recipe unchanged.
- After deletion, the user must return to `/vault` with safe page and filter handling.

## 7. Routing and Display

Local recipes must not require new statically generated `/recipes/[id]` pages. They must open through a client-based detail view at:

`/vault?recipe=<id>`

Requirements:

- Existing static fixture routes at `/recipes/[id]` must continue to work.
- `/vault?recipe=<id>` must be able to display both local and fixture-based recipes.
- An invalid or locally deleted ID must show a Swedish, brand-aligned fallback and a link back to `Vault`.
- The detail view must have the same shell, breadcrumbs, metadata, ingredient list, and numbered instructions as existing recipe details.
- Editing must be openable from the detail view without losing the draft.

## 8. Catalog Integration

Locally created and edited recipes must use the same catalog features as fixture recipes:

- Search by title, ingredients, and description.
- Category filtering, including multiple categories.
- Preparation-time filter.
- Sorting by archive date, archive number, and alphabetical order.
- Pagination.
- URL state for the catalog's existing parameters.

When a change affects the catalog, results, counts, and page handling must update without creating inconsistent URL parameters.

## 9. Accessibility and Interface

- Retain existing Swedish product terms: `Recept`, `Vault`, `Kategorier`, `Nytt recept`.
- Use semantic form fields with visible or correctly associated labels.
- Retain visible focus indicators.
- Dialogs must support keyboard input, `Escape`, focus management, and clear `aria` attributes.
- Autosave status must be communicated with messages such as `Sparar utkast`, `Utkast sparat`, or a Swedish error message.
- Publishing, editing, and deletion results must be perceivable by screen readers.
- Retain the existing mobile-first layout and `767px` breakpoint.

## 10. Technical Constraints

- No server-only runtime dependency.
- No external data fetching.
- No third-party UI component library.
- Client components must encapsulate browser API usage and protect against hydration problems.
- The existing static export must continue to work.
- Fixture types and taxonomy must continue to be imported through `lib/recipes.ts`.
- The data model must be extensible for future export, encryption, and synchronization.

## 11. Acceptance Criteria

Phase 2 is approved when:

1. A complete recipe can be created, published, and displayed in the client-based detail view.
2. An incomplete recipe can be autosaved as a draft and resumed after a reload.
3. A published recipe remains available after the browser is restarted.
4. Existing and new recipes can be edited.
5. Recipes can be deleted after confirmation and disappear from the catalog, categories, and detail view.
6. A recipe can have multiple categories and appear under all selected categories.
7. Archive numbers and archive dates are created automatically and provide deterministic sorting.
8. Validation works inline and upon publishing with Swedish, accessible error messages.
9. New recipes can be opened via `/vault?recipe=<id>` without a backend or dynamic server route.
10. `npx tsc --noEmit`, `npm run lint`, and `npx next build --webpack` pass.

## 12. Future Expansion

Phase 3 can build on this with custom categories, import/export, offline storage, encryption, and synchronization without changing the user's basic recipe form.

# Product Requirements Document (PRD): GitHub-Backed Recipe Database

> **Implementation status — 2026-09-10:** This GitHub-backed design is not
> implemented in Recept yet. The current Phase 2 application is a static
> export and has no GitHub API calls, remote data fetching, repository
> configuration, token handling, or GitHub Action. Its implemented read/write
> behavior is documented in section 4. Sections 2, 3, 5, and the GitHub parts
> of section 6 describe the proposed integration, not current functionality.

## 1. Overview & Objective
Build a lightweight, zero-maintenance database for recipe storage using a dedicated GitHub repository. The repository will store individual recipe files in JSON format and maintain an auto-generated index file for fast client-side listing, searching, and filtering.

---

## 2. Repository Architecture & Layout

The user will manually create a dedicated repository (e.g., `recipe-db`).

```text
recipe-db/
├── .github/
│   └── workflows/
│       └── build-index.yml       # (Optional) Action to generate index.json on push
├── index.json                    # Summary catalog for fast list/search views
└── recipes/
    ├── 048-rostad-morotssoppa-med-vitbonor.json
    └── ...
```

### File Naming Convention
* Standard format: `recipes/{id}-{slug}.json` (e.g., `recipes/048-rostad-morotssoppa-med-vitbonor.json`).
* Guarantees unique file paths while keeping files identifiable and human-readable in the GitHub UI.

---

## 3. Data Specification

### 3.1 Full Recipe Schema (`recipes/*.json`)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Unique identifier (e.g., `"048"`). Zero-padded strings or UUIDs. |
| `slug` | `string` | Yes | URL-friendly identifier (e.g., `"rostad-morotssoppa-med-vitbonor"`). |
| `title` | `string` | Yes | Display title of the recipe. |
| `category` | `string` | Yes | Display name of the category (e.g., `"Middag"`). |
| `categorySlug` | `string` | Yes | URL-safe category key (e.g., `"middag"`). |
| `prepMinutes` | `number` | Yes | Total preparation/cooking time in minutes. |
| `archivedAt` | `string \| null` | No | ISO date (`"YYYY-MM-DD"`) if archived, or `null`. |
| `context` | `string` | No | Short highlight / key ingredient descriptor (e.g., `"Morot · vita bönor · rosmarin"`). |
| `ingredients` | `string[]` | Yes | Ordered array of raw ingredient strings. |
| `instructions` | `string[]` | Yes | Ordered step-by-step instructions. |

### 3.2 Index Schema (`index.json`)
To avoid fetching multiple individual files when loading lists or search views, `index.json` stores an array of recipe summaries (omitting heavy arrays like `ingredients` and `instructions`):

```json
[
  {
    "id": "048",
    "slug": "rostad-morotssoppa-med-vitbonor",
    "title": "Rostad morotssoppa med vitbönor",
    "category": "Middag",
    "categorySlug": "middag",
    "prepMinutes": 40,
    "archivedAt": "2026-02-18",
    "context": "Morot · vita bönor · rosmarin"
  }
]
```

---

## 4. Current Functional Behavior

### 4.1 Read Operations
* **Initial catalog:** The static fixture catalog is bundled from
  `data/recipes.json` through `lib/recipes.ts`; it is not fetched from
  `index.json`, GitHub, or another remote source.
* **Hydrated vault:** After client hydration, `RecipeVaultProvider` reads
  browser `localStorage` and merges local additions and fixture overlays into
  the fixture catalog. Fixture IDs recorded as locally deleted are excluded.
  The three keys are:
  * `recept.phase2.recipes.v1` — local additions and fixture overlays.
  * `recept.phase2.drafts.v1` — incomplete editor drafts.
  * `recept.phase2.deleted.v1` — IDs of fixtures hidden in this browser.
* **View single recipe:** Bundled fixtures use the statically generated route
  `/recipes/[id]`. Locally created or altered vault entries are viewed through
  `/vault?recipe={id}`. Neither path fetches an individual recipe file.
* **Filter & search:** The client filters the in-memory catalog by the existing
  catalog controls. No additional network call is made.
* **Scope of persistence:** Local changes are browser- and origin-specific;
  they do not sync to another device, browser profile, GitHub repository, or
  the deployed static files.

### 4.2 Write Operations
* **Drafts:** The recipe editor writes incomplete drafts to
  `recept.phase2.drafts.v1` after a 500 ms debounce and again when the editor
  closes. Drafts may be incomplete.
* **Add / publish:** The client validates the draft, assigns the next numeric
  archive ID from the merged in-browser catalog (zero-padded to at least three
  digits), stamps the local date as `archivedAt`, and saves the record as a
  local addition in `recept.phase2.recipes.v1`. Publishing then clears the
  corresponding draft. No slug is generated and no file or index is written.
* **Edit:** The client validates and saves edits locally while preserving the
  recipe's ID and archive date. Editing a fixture stores a full local overlay;
  editing a locally added recipe replaces that local addition. There is no
  GitHub `sha` lookup or `PUT` request.
* **Delete:** After confirmation, a locally added recipe is removed from local
  additions. A fixture recipe's ID is written to
  `recept.phase2.deleted.v1`, hiding it from this browser's merged vault. This
  is a local hide/delete operation, not an archive update and not a remote soft
  delete.
* **Failure handling:** If browser storage is unavailable or a write fails,
  the operation reports a Swedish storage error and does not update the
  in-memory vault state.

### 4.3 Requirements for the Proposed GitHub Migration

The GitHub read and write workflow originally described in this PRD remains a
future migration. It must not be described as present behavior until the app
actually fetches the repository index and persists recipes through an
authorized server-side or otherwise secure integration. Because Recept is
currently configured as `output: "export"`, a browser bundle must never embed
a write-capable GitHub token.

---

## 5. Proposed Automation: Index Generation (GitHub Action)

This workflow does not exist in the current repository. If the proposed GitHub
storage is implemented, a lightweight GitHub Action can rebuild `index.json`
whenever files in `recipes/` change, avoiding a client-side dual write and its
associated race conditions.

```yaml
# .github/workflows/build-index.yml
name: Rebuild Recipe Index

on:
  push:
    paths:
      - 'recipes/**.json'
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Generate index.json
        run: |
          node -e '
            const fs = require("fs");
            const path = require("path");
            const dir = "./recipes";
            const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
            const index = files.map(file => {
              const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
              const { ingredients, instructions, ...summary } = data;
              return summary;
            });
            fs.writeFileSync("index.json", JSON.stringify(index, null, 2));
          '

      - name: Commit and push changes
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add index.json
          git diff --quiet && git diff --staged --quiet || (git commit -m "chore: rebuild index.json" && git push)
```

---

## 6. Non-Functional & Security Requirements

1. **Current storage:** No token, GitHub credential, or remote caching behavior
   exists today. Local persistence is best-effort and errors must remain
   visible to the user.
2. **Future token security:** A write-capable GitHub token must never be
   shipped to the static client. Any future credential must be protected by a
   secure server-side integration and limited to this repository's required
   contents permissions.
3. **Future caching:** If using `raw.githubusercontent.com` directly, account
   for its cache headers. For reads immediately after a successful remote
   write, use an appropriate authenticated API response or deliberate cache
   invalidation.
4. **Data integrity:** The current editor validates required title, category,
   preparation time, ingredient, and instruction fields before publishing.
   The future GitHub integration must additionally validate the persisted file
   schema before committing it.

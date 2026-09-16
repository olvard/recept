# Recept

<p align="center">
  <img src="public/logo.png" alt="Recept" width="480">
</p>

Recept is a personal, private recipe vault for collecting recipes in a calm, practical place. Browse, search, and filter the archive; write your own recipes; or import one from the web and review it before saving.

Recipe data lives in a separate private GitHub repository. The app reads and writes it on the server, so GitHub tokens and OpenAI keys never reach the browser.

## Features

- Search, categorize, sort, and paginate the recipe archive.
- Create, edit, and soft-delete recipes.
- Import recipes from supported web pages. Structured recipe data is preferred, with OpenAI used only to fill in missing details.
- Review imported recipes before saving them.
- Store each recipe as its own JSON file, plus a lightweight `index.json`, in GitHub.
- Use a mobile-friendly recipe-editor flow at `/recept/nytt`.

## Technology

- Next.js 16 with the App Router and Node.js runtime
- React 19 and TypeScript
- GitHub API for the recipe database
- OpenAI for context tags and, when necessary, completing imported recipes
- Zod for validation, Vitest for tests, and ESLint for code quality

## Getting started

Prerequisites: a current Node.js LTS release, npm, a private GitHub repository for recipes, a GitHub token with read/write access to its contents, and an OpenAI API key.

```bash
git clone <repository-url>
cd recept
npm install
cp .env.example .env.local
```

Then populate `.env.local`:

```dotenv
GITHUB_RECIPE_DB_OWNER=your-github-user-or-organization
GITHUB_RECIPE_DB_REPO=your-private-recipe-repository
GITHUB_RECIPE_DB_BRANCH=main
GITHUB_RECIPE_DB_TOKEN=your-github-token
OPENAI_API_KEY=your-openai-api-key
# Optional: model used for importing and tagging
OPENAI_RECIPE_MODEL=
# Optional: identification when fetching recipe pages
RECIPE_IMPORT_USER_AGENT=ReceptRecipeImporter/0.1
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page redirects to `/vault`.

> Keep `.env.local` private. It is ignored by Git; never put secrets in client code or commit them.

## Set up the recipe database

1. Create a new **private** GitHub repository for your recipes.
2. Copy the contents of [`recipe-db-template/`](recipe-db-template) into that repository, including the hidden `.github` directory. Its workflow rebuilds `index.json` when recipe files change.
3. From the recipe database repository's root, run this project's seed script to create the eight sample recipes:

   ```bash
   node ../recept/scripts/seed-recipe-db.mjs ../recept/data/recipes.json
   ```

4. Commit and push `recipes/` and `index.json` to the branch configured in `GITHUB_RECIPE_DB_BRANCH`.
5. Create a GitHub token that can read and write the repository contents, then set it as `GITHUB_RECIPE_DB_TOKEN`.

The database contains one file per recipe, named `recipes/<id>-<slug>.json`. Root-level `index.json` holds summaries only, enabling fast catalogue reads. Recipes are saved atomically through GitHub commits, and the app retries concurrent changes.

## Project structure

```text
app/                    Pages, Route Handlers, and user interface
app/api/                Recipe and recipe-import API
app/components/         Catalogue, editor, dialogs, and detail view
data/recipes.json       Eight seed recipes for a new recipe database
lib/recipe-db.ts        Server-side GitHub storage and validation
lib/recipe-import/      Safe fetching, extraction, and normalization
lib/recipe-tags.ts      OpenAI-powered context tags
recipe-db-template/     Template for the separate recipe repository
scripts/                Seed tool and legacy data files
```

## Common commands

```bash
npm run dev              # development server
npm run lint             # ESLint
npm test                 # Vitest, run once
npm run test:watch       # Vitest in watch mode
npx tsc --noEmit         # type check
npx next build --webpack # production build
npm run start            # start a built application
```

Run at least the type check and linter after changes. Changes to API routes, imports, tagging, or recipe persistence should also be followed by `npm test`.

## Routes and API

| Route | Purpose |
| --- | --- |
| `/vault` | Recipe catalogue with URL-driven search, filters, and sorting |
| `/recipes/[id]` | Recipe detail view |
| `/recept/nytt` | Mobile-friendly editor for new recipes |
| `GET /api/recipes` | Fetch recipe summaries for the catalogue |
| `POST /api/recipes` | Create a recipe |
| `GET`, `PUT`, `DELETE /api/recipes/[id]` | Fetch, update, or soft-delete a recipe |
| `POST /api/recipe-import` | Fetch and prepare a recipe from a URL for review |

Write API requests require the same origin. Recipe imports use constrained, safe fetching and respect websites' robots rules.


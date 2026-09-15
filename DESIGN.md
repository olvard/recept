# Recept design specification

## 1. Product and visual intent

Recept is a private Swedish collection of recipes for Oliver and Wilma. It should feel like a useful kitchen bulletin: warm paper, clear black rules, bright orange notices, and an unapologetically yellow action button. The reference is a narrow, editorial mobile list rather than a soft lifestyle app.

The visual character is **practical, printed, warm, and direct**. Preserve the sense of a neatly typeset household noticeboard: generous empty space, hairline rules, compact facts, and one high-contrast action at a time.

Use Swedish UI copy throughout: `Recept`, `Nytt recept`, `Sök recept…`, `Tid: valfri`. Use `Tillagd` for the date a recipe was added.

### Principles

1. **Mobile is the primary composition.** Design the 390 px-wide view first; desktop is the same system with more room, not a different visual language.
2. **Structure replaces decoration.** Use alignment, borders, type, and spacing to communicate hierarchy. Do not add gradients, shadows, illustrations, glass effects, or decorative texture.
3. **One loud action.** Reserve yellow for the primary create/save action and orange for utility emphasis, counts, and active states.
4. **Recipes are a readable index.** A list row should reveal its number, title, short description, category, and preparation time at a glance.
5. **Keep control text plain.** Controls and metadata are concise Inter text, never decorative or monospaced.

## 2. Foundations

### Color tokens

| Token | Value | Purpose |
| --- | --- | --- |
| `--color-canvas` | `#FCFAF2` | Warm off-white page background and default paper surface |
| `--color-ink` | `#171717` | Text, icons, borders, and offset button edge |
| `--color-orange` | `#FF5A00` | Top utility strip, active filter, item numbers, small emphasis |
| `--color-yellow` | `#FFF200` | Primary action fill only |
| `--color-muted` | `#76736B` | Secondary descriptions and placeholder text |
| `--color-focus` | `#005FCC` | Keyboard focus outline; do not use orange alone for focus |

Use flat, opaque colors only. `--color-canvas` is the default surface for cards and inputs too; separate areas with black rules instead of tinted panels. Never substitute the old pink, rose, purple, or moss palette.

### Typography

| Role | Font | Weight | Size and line-height |
| --- | --- | --- | --- |
| Wordmark and display headings | Lora | 700 | `clamp(2rem, 7vw, 3rem)` / `1` |
| Page and section headings | Lora | 700 | `1.5rem–2rem` / `1.1` |
| Recipe title | Inter | 400 or 500 | `1.125rem–1.25rem` / `1.3` |
| Button and filter label | Inter | 600 or 700 | `0.8125rem–0.9375rem` / `1.2` |
| Body and form text | Inter | 400 | `1rem` / `1.5` |
| Description and metadata | Inter | 400 | `0.6875rem–0.8125rem` / `1.4` |
| Utility strip | Inter | 500 | `0.625rem–0.6875rem` / `1.2` |

Lora is bold only and is reserved for the brand and meaningful headings. Inter is used for everything else, including recipe descriptions, metadata, filter labels, input placeholders, small utility text, and numbers. Do not use IBM Plex Mono, IBM Mono, Syne Mono, or any monospace font. Do not simulate a typewriter look through letter spacing.

Use sentence case for labels and headings; the wordmark remains `RECEPT`. Letter spacing is normal except for deliberate compact utility text (at most `0.02em`).

### Spacing and dimensions

Use a 4 px base unit: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px. On mobile, page gutters are `18px`; at 768 px and above they are `32px`. Keep touch targets at least `44px` tall.

- Utility strip: `30px` tall.
- Mobile header: `150px–164px` including the primary action.
- Primary action: `44px` minimum height, `2px` ink border, `4px` solid ink offset down/right.
- Search field: `42px` minimum height, `1px` ink border.
- Filter chips: `28px–32px` height with `1px` ink border.
- Catalog divider: `1px` ink; use it to separate every recipe row.

## 3. Layout and responsive behavior

### App shell

The shell is a single off-white paper field. At the top, a full-bleed orange utility strip shows `RECEPT`, the recipe count, household ownership, and the day. The content header follows with the primary action.

On mobile the primary `+ Nytt recept` button spans the content width. Use a compact plus glyph before the label; it is a textual/line icon, not an emoji. A black horizontal rule separates the header from the catalog controls.

The utility strip is static information rather than navigation. Preserve the orange strip, paper canvas, solid rules, and yellow primary action. The application shell changes at `767px`; never hide the create action on mobile.

### Catalog page

The catalog sequence is:

1. Search input, always visible.
2. Category filter chips.
3. A compact preparation-time select or disclosure.
4. A full-width divider with breathing room above it.
5. Numbered recipe rows.

On mobile, only the search and the essential filter controls appear initially; any extra filters remain collapsed. Search changes replace URL state; intentional filter, sort, reset, and pagination changes push URL state. Filter and sort changes reset the page.

Do not place recipes in floating cards. A catalog is one continuous list bounded by horizontal rules.

### Recipe row anatomy

Each row is a two-column layout: a narrow orange archive number (`01`, `02`, etc.) at left and the recipe content at right. The content order is title, muted one-line description, then category tag and preparation time.

- Keep the title on the first visual line when possible; permit wrapping without truncating meaningful names.
- Use Inter for the title and all supporting text.
- Description is muted, small, and can wrap to two lines if needed.
- Category is a small outlined pill only because it communicates a compact classification. Preparation time is plain text beside it.
- The full row is the recipe-link target and has a visible keyboard focus treatment.
- Use archive IDs in URLs, but show friendly two-digit list indices when the catalog design calls for them.

### Forms, editor, and detail views

Use the same paper background, ink rules, Lora headings, and Inter controls. Group fields through spacing and dividers rather than colored cards. Labels are visible above inputs; placeholders only provide examples. Primary save/publish actions use yellow. Destructive or error states use clear text, an ink border, and an accessible status message; do not overload orange as an error color.

## 4. Components and interaction states

### Buttons

- **Primary:** yellow fill, `2px` ink border, `4px` hard ink offset, Inter 700 label, black text. On press, remove the offset and shift the button down/right by the same amount.
- **Secondary:** canvas fill, `1px` ink border, no shadow or offset unless it represents a primary action.
- **Icon button:** only when a text label would be redundant; provide an accessible name and a `44px` touch target.
- **Disabled:** retain the shape and label, reduce contrast modestly, and prevent interaction. Never convey disabled status by color alone.

### Search and selects

Inputs are square-cornered, canvas-filled, and ink-bordered. The search field includes a simple black search icon at left, then Inter placeholder text. Show a `2px` `--color-focus` outline with a `2px` offset on keyboard focus. The time filter uses a visible text label and chevron; do not make a custom control indistinguishable from plain text.

### Filter chips and tags

Chips are compact, rounded only enough to read as tokens (`999px` radius), canvas-filled, and ink-bordered. The selected category uses orange fill with ink text and border. Always pair the category name with its count, e.g. `Alla 06`; color is never the sole selected-state signal.

### Dialogs and feedback

Dialogs use a canvas surface, square or subtly rounded corners (maximum `4px`), solid ink border, and no blurred shadow. Keep Escape and outside-click closing behavior. Trap focus, restore it to the trigger, and label the dialog semantically.

Use concise inline feedback near the affected control and announce changing recipe-result counts via an `aria-live` region. Toasts are reserved for confirmation that does not require an immediate decision.

## 5. Accessibility and quality bar

- Meet WCAG 2.2 AA contrast. Check final combinations, especially orange text on canvas and yellow button text.
- Every control works with keyboard and touch, has a visible focus indicator, and has an accessible name.
- Use semantic landmarks, headings in order, real buttons for actions, real links for navigation, associated labels, and descriptive validation errors.
- Respect `prefers-reduced-motion`; transitions are brief and optional, with no looping motion.
- Load only the Lora 700 and Inter weights actually used. Prefer stable font loading and system fallbacks (`Georgia, serif` for Lora; `system-ui, sans-serif` for Inter).
- Keep visual effects lightweight: no image-led hero, autoplay media, gradients, or shadows.

## 6. Do and do not

**Do:** make the canvas look like clean kitchen paper; use strong black rules; give the main action a yellow fill and hard offset; make recipe metadata compact; let whitespace make the index easy to scan.

**Do not:** use pink or purple surfaces; use rounded cards; use blurred elevation; use monospaced or IBM typography; turn every control into a pill; add decorative food imagery to compensate for weak hierarchy; or translate the established Swedish product vocabulary into English.

## 7. Overall impression

The finished interface should look like a calm, well-used private recipe bulletin: off-white paper, orange notices, crisp black type and dividers, a yellow `Nytt recept` button, Lora-bold editorial headings, and Inter everywhere else. It should feel immediate and handmade in spirit, while remaining precise, accessible, and easy to use on a phone.

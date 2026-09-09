# Sustainable Web Design System

## Design direction

The interface should feel warm, practical, editorial, and resource-conscious. It should communicate care for ingredients, people, and the planet through a restrained visual language: a small color palette, generous whitespace, strong hierarchy, visible structure, and purposeful motion.

Sustainable web design is treated here as both an aesthetic and a performance principle. Pages should be lightweight, durable, easy to scan, and useful without decoration that does not improve understanding.

## Core palette

| Token | Hex | Use |
| --- | --- | --- |
| `--color-bg` | `#f8f0aa` | Main page background |
| `--color-fg` | `#a93115` | Primary text, headings, borders, and key actions |
| `--color-paper` | `#fff9d6` | Cards, notes, inputs, and elevated surfaces |
| `--color-moss` | `#2f5d50` | Secondary actions, tags, success states, and natural accents |
| `--color-clay` | `#d96b27` | Highlights, warnings, and active indicators |
| `--color-ink` | `#5a2a1d` | Long-form text when softer contrast is useful |

The yellow background and tomato-red foreground are the signature combination and should dominate the experience. Moss and clay are supporting accents, not alternate brand colors. Use paper sparingly to create grouping and focus without introducing many surfaces.

### Color rules

- Prefer flat fills and solid borders over gradients, shadows, and decorative textures.
- Use `--color-fg` on `--color-bg` for primary text and controls.
- Use `--color-bg` or `--color-paper` for text on `--color-fg` buttons; verify contrast for every pairing.
- Never use color as the only signal. Pair states with labels, icons, borders, or text.
- Keep large areas of the page in the core background to reduce visual and CSS complexity.
- Focus states should use a visible `2px` outline in `--color-moss`, with an offset that does not depend on a shadow.

## Typography

### Families

- **Display and interface headings:** `Syne Mono`, monospace fallback.
- **Body, labels, and utility text:** `Inter`, sans-serif fallback.

Titles should feel deliberate and slightly technical. Body text should be calm, highly readable, and straightforward. Load only the weights and character subsets the product actually uses; prefer locally hosted, compressed font files where possible.

### Type scale

| Role | Size | Line height | Family |
| --- | ---: | ---: | --- |
| Display | `clamp(2.5rem, 7vw, 6rem)` | `0.95` | Syne Mono |
| Page heading | `clamp(2rem, 4vw, 3.5rem)` | `1` | Syne Mono |
| Section heading | `1.5rem–2rem` | `1.1` | Syne Mono |
| Card heading | `1.125rem–1.375rem` | `1.15` | Syne Mono |
| Body | `1rem–1.125rem` | `1.55` | Inter |
| Small / metadata | `0.8125rem–0.9375rem` | `1.35` | Inter |

Use sentence case for headings and labels. Avoid dense all-caps typography; if an overline is needed, keep it short, use Inter, and add modest letter spacing.

## Shape, borders, and elevation

Larger components are square by default. Cards, panels, navigation containers, buttons, inputs, dialogs, and image frames use no border radius.

- Default radius: `0`.
- Note-style radius: `0.5rem–0.75rem`.
- Note-style components include tips, annotations, toasts, inline messages, and small status spans.
- Use `1px` borders for grouping and `2px` borders for emphasis.
- Favor a hard, offset border treatment over blurred box shadows when depth is needed.
- Do not use rounded pills for ordinary buttons or cards. A pill is reserved for a compact status or tag where the shape communicates its compactness.

## Layout and spacing

Use a simple, responsive grid with a maximum content width of roughly `72rem`. Keep the reading measure between `45rem` and `70rem` depending on content type.

Use a consistent spacing scale based on `0.25rem`: `0.25`, `0.5`, `0.75`, `1`, `1.5`, `2`, `3`, and `4rem`. Prefer fewer, larger spacing decisions over many small adjustments.

Layouts should remain useful on narrow screens. Stack columns before shrinking text, keep touch targets at least `44px`, and preserve generous edge padding (`1rem` minimum, `1.5rem` or more on larger screens).

## Component language

### Navigation

Navigation is compact and text-led. Use Syne Mono for the brand and active navigation item, with Inter for supporting controls. Active states can use an underline, a solid block, or a moss-colored marker; do not rely on hover-only feedback.

### Buttons

Buttons are rectangular, bordered, and direct. The primary button uses `--color-fg` as its fill with a light text color; the secondary button is transparent with a `--color-fg` border. Provide clear pressed and disabled states, and keep labels action-oriented.

### Cards and recipe surfaces

Cards use a flat `--color-paper` surface, square corners, and a visible border. Information hierarchy should come from spacing, typography, and small color accents rather than shadows. Keep metadata close to the title and make the primary action obvious.

### Notes, toasts, and inline messages

These are the main places where rounding is allowed. Use a paper or moss surface, a short label, and concise supporting text. A note may use a small clay marker or icon, but should remain quiet enough not to compete with the main task.

### Forms

Inputs are rectangular with a solid border and a paper background. Labels are always visible; placeholders are supplemental only. Error text should be adjacent to the field and paired with a border/color change plus explanatory copy.

## Imagery and iconography

Use real, useful imagery: ingredients, finished dishes, growing environments, or process details. Prefer appropriately sized responsive images, modern formats, lazy loading below the fold, and explicit dimensions to avoid layout shifts.

Icons should be simple line or solid symbols with consistent stroke weight. Avoid large decorative illustrations if they add significant payload without adding meaning. Alt text should describe the purpose of an image, not its visual style.

## Motion and interaction

Motion should clarify state, hierarchy, or progress. Use short transitions for menus, focus, and feedback; avoid perpetual animation, parallax, and autoplay media. Respect `prefers-reduced-motion` by removing non-essential transitions and movement.

Hover is an enhancement, not a requirement. Every interactive state must work with keyboard, touch, and assistive technology. Use visible focus indicators and preserve logical tab order.

## Sustainable implementation principles

- Ship minimal JavaScript and prefer semantic HTML and CSS for layout and interaction.
- Avoid autoplay video, oversized hero media, unnecessary carousels, and heavyweight animation libraries.
- Optimize images, defer non-critical assets, and reserve space before media loads.
- Use system fallbacks while fonts load; avoid invisible text and unnecessary font weights.
- Keep pages cacheable and avoid fetching content that is not needed for the current view.
- Provide a useful experience on slow connections and small screens.
- Design components to be durable: clear content, reusable patterns, and few one-off visual effects.

## Accessibility baseline

Meet WCAG 2.2 AA targets wherever applicable: at least `4.5:1` contrast for normal text, `3:1` for large text and UI graphics, keyboard access to every control, visible focus, semantic landmarks, correctly associated labels, and reduced-motion support. Test the actual rendered color combinations rather than relying on the token names.

## Overall impression

The finished UI should feel like a well-made printed recipe card translated to the web: warm yellow paper, tomato-red ink, monospaced editorial headings, clean sans-serif reading text, firm square structure, and just enough natural green and clay color to guide attention.

# Spifex Design System

Authoritative, evidence-based reference for the Spifex frontend visual language.
This documentation was reverse-engineered from the existing `spifex-front-end`
source in November 2026. It formalizes what the application already does; it does
not propose a redesign.

- **Repository:** `spifex-front-end`
- **Framework:** React 18.3.1 + TypeScript (strict) + Vite 6 + React Router 7
- **Styling:** Tailwind CSS v4 through `@tailwindcss/vite`, imported by `src/App.css`
  (`@import "tailwindcss";`)
- **Global tokens:** CSS custom properties in `src/index.css`
- **Motion:** `framer-motion` 12, with CSS transitions for layout and sidebar
- **Icons:** `lucide-react`
- **i18n:** `i18next` + `react-i18next` (no hardcoded user-facing copy)

---

## 1. Purpose

Future contributors and AI agents must be able to:

1. Identify the canonical implementation for any UI element.
2. Reuse it instead of creating a near-duplicate.
3. Apply the same tokens, spacing, states and accessibility behavior everywhere.
4. Recognize existing inconsistencies and fix them in the documented order
   instead of spreading them further.

## 2. Authority order

When sources disagree, use this order:

1. **This documentation** — the target standard.
2. **Shared primitives** in `src/shared/ui/**` — living implementation of the standard.
3. **High-traffic product surfaces** (`src/products/business/**`, settings,
   accounting, finance) — established patterns worth preserving.
4. **`src/index.css`** — the only real global token layer.
5. **`tailwind.config.js`** — **deleted.** Tailwind v4 reads its configuration from
   the CSS entry point (`src/App.css`), not from a JS config.

`src/index.css` no longer uses `!important` for fonts or focus. Its unlayered
focus rule intentionally overrides utility resets; do not add scoped focus
overrides (see [12-ai-implementation-rules.md](12-ai-implementation-rules.md)).

## 3. Documentation index

| File | Read it when you need… |
| --- | --- |
| [01-design-principles.md](01-design-principles.md) | Product character, density rules, decision hierarchy |
| [02-design-tokens.md](02-design-tokens.md) | Token names, radius/shadow/z-index/spacing scales |
| [03-typography.md](03-typography.md) | Font sizes, weights, numeric and truncation rules |
| [04-colors-and-themes.md](04-colors-and-themes.md) | Color roles, surfaces, contrast table, dark-mode status |
| [05-spacing-and-layout.md](05-spacing-and-layout.md) | Page padding, grids, control heights, table density |
| [06-component-standards.md](06-component-standards.md) | Per-component specs and canonical source files |
| [07-navigation-and-responsive.md](07-navigation-and-responsive.md) | Shell, sidebar, navbar, breakpoints, mobile rules |
| [08-interactions-and-motion.md](08-interactions-and-motion.md) | States, hover/active, timing, loading and feedback |
| [09-accessibility.md](09-accessibility.md) | Focus, keyboard, ARIA, contrast requirements |
| [10-inconsistency-audit.md](10-inconsistency-audit.md) | Every known defect, with file paths and fixes |
| [11-migration-roadmap.md](11-migration-roadmap.md) | Execution order and phase gates |
| [12-ai-implementation-rules.md](12-ai-implementation-rules.md) | Compact rules and pre-implementation checklist |

## 4. Design system in one screen

| Property | Canonical value | Source |
| --- | --- | --- |
| Font family | `Inter` (weights 100-900 available) | `src/index.css` |
| App body size | `13px` (`text-[13px]`) | shared primitives, settings surface |
| Metadata size | `12px` (`text-xs`) | `DataTable`, `Select` |
| Caption size | `11px` | `Button xs`, input messages |
| Eyebrow size | `10px` decorative, `11px` minimum when meaningful, uppercase, `tracking-wide` | settings headings, metrics |
| Page title | `24px` / `600–700` (`text-2xl`) | feature page headers |
| Brand action color | `--accentPrimary: #F46A35` | `src/index.css` |
| App neutral family | Tailwind `gray` | tables, inputs, sidebar |
| Overlay/settings neutral | Tailwind `slate` | settings, reporting, snackbar |
| Control radius | `rounded-md` (6px) | `Button`, `Input`, `Select`, `Switch` |
| Panel radius | `rounded-lg` (8px) | tables, sidebar rows, settings cards |
| Floating radius | `rounded-xl` (12px) | dialogs, popovers, toasts |
| Pill radius | `rounded-full` | badges, avatars, toggle tracks |
| Page gutter | `px-4` mobile, `sm:px-7` desktop | `PageSkeleton`, feature pages |
| Content width | `max-w-[1440px]`, centered | settings surface, feature pages |
| Shell breakpoint | `md` (768px) | `ApplicationShell`, `Navbar`, `Sidebar` |
| Default shadow | `shadow-sm` for panels; `0 8px 32px #26334d20` for floating | `ConfirmToast`, `Popover` |

## 5. How AI agents should use this

1. Read [12-ai-implementation-rules.md](12-ai-implementation-rules.md) first — it is
   intentionally compact.
2. Load only the specialist file for the area being changed.
3. Before writing a class string, check [06-component-standards.md](06-component-standards.md)
   for an existing primitive.
4. Before adding a token or arbitrary value, read [02-design-tokens.md](02-design-tokens.md).
5. If the change touches an audit item, follow its ID in
   [10-inconsistency-audit.md](10-inconsistency-audit.md) and its phase in
   [11-migration-roadmap.md](11-migration-roadmap.md).

## 6. Conventions used in this documentation

- **Canonical** — established in shared code and safe to reuse.
- **Provisional** — inferred from limited evidence; verify before standardizing.
- **Legacy** — exists but should not be copied into new code.
- **Defect** — documented in the audit; do not treat current behavior as a standard.
- File references are repository-relative (`src/...`). Line numbers are indicative,
  not stable.

## 7. Scope and non-goals

In scope: color, type, spacing, layout, components, navigation, motion,
accessibility, and the rules for changing them.

Out of scope: business logic, API contracts, routing policy, localization content,
backend changes, and any visual redesign that is not justified by an audit finding.

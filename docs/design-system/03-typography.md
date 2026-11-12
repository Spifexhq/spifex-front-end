# 03 — Typography

## 1. Font family

```css
/* src/index.css */
:root { --font: Inter, -apple-system, BlinkMacSystemFont, Helvetica, sans-serif; }
html { font-family: var(--font); }
```

- **Canonical family:** `Inter`, loaded from Google Fonts (`wght@100..900`).
- **Fallbacks:** platform UI stack. No self-hosted font, no variable-font asset in
  the repository.
- The family is set once on `html` without `!important`, so utilities such as
  `font-mono` still work (verified in the production build).
- `Open Sans` is no longer imported; Inter is the only font request.

## 2. Type scale

The application uses a compact, pixel-precise scale rather than Tailwind's named
sizes. Canonical sizes:

| Step | Class | Size / line-height | Role | Typical usage |
| --- | --- | --- | --- | --- |
| Micro | `text-[10px]` | 10px / 1 | Count badge, chip | Count badges, `chip` in `Input/Select` |
| Caption | `text-[11px]` | 11px / 1.2 | Helper, error, dense metadata | Input errors, `Button xs`, popover actions, footnote |
| Meta | `text-xs` | 12px / 16px | Labels, table cells, secondary controls | `Input` `md`, `Table` cells, `Button sm`, `Select` items |
| Body | `text-[13px]` | 13px / 20px | **Default app text** | `Button md`, settings page, `DataTable` table, dialog body |
| Body large | `text-sm` | 14px / 20px | Long-form and form descriptions | Auth forms, marketing copy, help text |
| Subhead | `text-[15px]` | 15px / 22px | Drawer/panel titles | `side-panel.css` header `h1`, some card titles |
| Base | `text-base` | 16px / 24px | Large control text | `Button lg`, empty-state titles |
| Section | `text-lg` | 18px / 28px | Feature section titles | Card headers in reporting |
| Page title (small) | `text-xl` | 20px / 28px | Rare panel heading | Not used for feature page `<h1>`; page titles are `text-2xl` |
| **Page title** | `text-2xl` | 24px / 32px | **Canonical page title** | Feature headers, auth, financial activity |
| Hero | `text-3xl` / `text-4xl` | 30/36px | Marketing/status only | `Status`, landing, auth hero |

**Canonical compact scale:** 10 / 11 / 12 / 13 / 15 / 16 / 18 / 20 / 24.
14px (`text-sm`) is allowed for prose and auth, not for operational controls.
17px is not part of the scale.

## 3. Weights

| Weight | Class | Use |
| --- | --- | --- |
| 400 | `font-normal` | Body, table values, descriptions |
| 500 | `font-medium` | **Default emphasis**: labels, buttons, table headers, active nav, numbers |
| 600 | `font-semibold` | Panel headings, dialog titles, totals |
| 700 | `font-bold` | Page titles, hero headings, large totals |
| 300 / 800 | `font-light` / `font-extrabold` | Do not use in product UI |

The system is medium-heavy: most interactive text is `font-medium`, most
headings `font-semibold`. Avoid mixing `font-medium` and `font-semibold` on the
same hierarchy level.

## 4. Line height and rhythm

- Default for 12–13px text: `leading-5` (20px).
- Compact labels/eyebrows: `leading-none` or `leading-tight` (1.25).
- Prose in descriptions: `leading-relaxed` (1.625).
- Drawer headers: `15px/22px` (`side-panel.css`).
- Page titles: `text-2xl` with default 32px line height; do not add `leading-*`
  unless the title wraps.

## 5. Numeric and financial text

- All monetary values, quantities, percentages and dates in tables use
  `tabular-nums` (36 occurrences). This is required for column alignment.
- Numeric table columns are right-aligned; the first (name) column is left-aligned.
- Currency symbols are secondary: render the amount at full contrast and the
  symbol/code at `text-gray-500` or `text-[11px]`.
- Negative values use `text-red-600`/`rose-600`; positive deltas use
  `text-emerald-600/700`. Never rely on color alone — pair with a sign or label.
- Do not use `font-mono` for money: the global font override defeats it and
  proportional Inter with `tabular-nums` is the established look.

## 6. Casing, tracking and truncation

- **Uppercase** is reserved for eyebrows and column group labels:
  `text-[11px]` (or `text-[10px]` for purely decorative counters),
  `font-semibold`, `tracking-wide` (61 usages), color `text-gray-500` or
  `#465164` in settings.
- `tracking-tight` (38 usages) belongs to large reporting/hero headings; do not
  apply it to controls.
- Truncation pattern: parent `min-w-0`, child `truncate` (`overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap`). Tables and breadcrumbs rely on it.
- Wrapping pattern for settings rows: `break-words` plus
  `[overflow-wrap:anywhere]` so long emails/URLs do not overflow.

## 7. Text color hierarchy

Use [04-colors-and-themes.md](04-colors-and-themes.md) for contrast values.

| Role | Class |
| --- | --- |
| Primary text / values | `text-gray-900` |
| Headings on white | `text-gray-900` or `text-slate-900` |
| Labels | `text-gray-700` |
| Secondary body | `text-gray-600` |
| Metadata, column headers | `text-gray-500` |
| Placeholder only | `text-gray-400` |
| Disabled | `text-gray-400` + `opacity-60` on the control |
| On dark surfaces | `text-white` / `text-slate-200` |

## 8. Typography findings

| ID | Severity | Issue | Canonical resolution |
| --- | --- | --- | --- |
| ✅ DS-014 | Medium | Arbitrary sizes outside the scale: `text-[10.5px]` labels, `text-[12.5px]` errors, `text-[15px]`, `text-[17px]` (`Button xl`) | Form controls now use 11 / 12 / 16; 15px remains for titles |
| ✅ DS-015 | Medium | `text-xs` (12px) and `text-[12px]` were used interchangeably (329 vs 113); same for `text-[13px]` vs `text-sm` in places | All 113 `text-[12px]` replaced with `text-xs`; `text-[13px]` is the body size, `text-sm` reserved for prose/auth |
| ✅ DS-016 | Low | `tailwind.config.js` declared `fontSize` keys `9px`–`12px` that never loaded (v4 ignores the file) | Deleted the config |
| ✅ DS-017 | Medium | `* { font-family: Inter !important }` defeated `font-mono` and any future per-element font | Replaced with `html` inheritance; `font-mono` verified |
| ✅ DS-018 | Low | `Open Sans` imported and unused | Import removed |
| ✅ DS-019 | Medium | Page titles varied between `text-xl`, `text-2xl` and `text-[22px]` | Standardized feature page `<h1>` to `text-2xl` (Phase 5, PR 17) |
| ✅ DS-020 | Low | Eyebrows at 9–10px were below comfortable reading size and often paired with low-contrast `gray-400` | Raised meaningful uppercase labels to 11px `font-semibold` `gray-500` (Phase 5, PR 17) |

## 9. Provisional decisions

- **14px body for prose** is treated as intentional (auth/help). Needs a content
  audit before it is either banned or promoted.
- **Line-height tokens** are not centralized; the 20px default for 12–13px text is
  inferred from utilities, not from a token. Phase 1 may add
  `--leading-compact: 20px`.
- **Tabular numerals everywhere** in tables is the target, but 36 usages out of
  many numeric cells means coverage is partial. Treat as a rule to enforce going
  forward, not a completed migration.

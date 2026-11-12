# Phase 5 evidence

## PR 17 — Page titles and eyebrows (`DS-019`, `DS-020`)

### Page titles

Standardized feature page `<h1>` to `text-2xl font-semibold tracking-tight`:

| File | Before | After |
| --- | --- | --- |
| `products/business/layouts/SettingsLayout` | `text-xl` | `text-2xl` |
| `products/personal/layouts/PersonalSettingsLayout` | `text-xl` | `text-2xl` |
| `products/personal/pages/BankAccounts` | `text-xl` | `text-2xl` |
| `products/business/pages/Overview` | `text-xl sm:text-2xl` | `text-2xl` |
| `products/business/pages/Reporting/Reports` | `text-xl md:text-2xl` | `text-2xl` |
| `products/business/pages/Finance/BankImports` | `text-xl` | `text-2xl` |

Auth screens, status pages, and modal/error headings keep their local sizes; they
are not feature page headers.

### Eyebrows

- Replaced every `text-[9px]` / `text-[10px]` uppercase label with
  `text-[11px] font-semibold uppercase tracking-wide text-gray-500`.
- Normalized `text-[11px] uppercase ... text-gray-600` eyebrows to `gray-500`.
- Removed the tiny 9px expand/collapse labels in the Finance and Personal
  selection toolbars (now 11px).
- Counts replaced: 23 gray-600 + 8 gray-500 + 3 tracking-wider + 2 nine-pixel +
  1 eleven-pixel gray-500 + 3 eleven-pixel gray-600 = 40 class strings.

### Verification

- `npx --no-install tsc -b` — pass.
- `npm run build` — pass.
- `npx --no-install eslint src` — 0 errors, 7 pre-existing warnings.
- `npm run lint` — unchanged; 24 pre-existing `.preview/*` errors.
- Grep: no `text-[9px]`/`text-[10px]` uppercase label remains; no feature page
  `<h1>` remains at `text-xl`/`text-[22px]`.

Runtime screenshots are not included for authenticated Settings/Accounting
surfaces; those routes need backend/auth data. Changes are class-only.

## PR 18 — Page padding (`DS-026`)

Normalized top padding to `py-6` on feature page containers:

| Surface | Before | After |
| --- | --- | --- |
| Accounting shell | `p-4 md:p-7` | `px-4 py-6 md:px-7` |
| Reports content | `py-4 sm:px-5` | `py-6 sm:px-5` |
| Help | `py-7` | `py-6` |
| Account settings mains (Limits, Notifications, Security, Personal, Groups, Organization×2) | `pb-10 pt-5` | `pb-10 pt-6` |

Already correct and unchanged: Business overview, Bank Imports, Onboarding,
Personal layout, and `.settings-page` surfaces (`24px 28px 40px` desktop from
`SettingsSurface`). Auth/status/legal pages keep their local landing padding.

Verification: `npx --no-install tsc -b` and `npm run build` pass; no feature page
container remains on `pt-5`/`py-7` for top padding.

## PR 19 — Meaningful `text-gray-400` (`DS-010`)

Raised meaningful captions to `text-gray-500` (4.83:1):

- Empty-state descriptions.
- Chart axis titles/legends and tooltip units.
- Settings/sidebar hints and section labels.
- Accounting status and setup-step labels.
- Dialog footer shortcut hints (8 sites).
- Table counts, integration descriptions, payment dates, permission codes.
- Selection toolbar expand/collapse labels.

Kept `gray-400` for:

- Input placeholders and disabled text.
- Decorative icons (search, breadcrumbs, close/info icons).
- Missing-value placeholders (`—`).
- Disabled/other-month date cells.

Verification: `npx --no-install tsc -b` and `npm run build` pass; remaining
`text-gray-400` uses are placeholder/disabled/decorative or icon-only controls.

## PR 20 — Icons (`DS-043`)

- Normalized Lucide `size` props to the canonical scale: **13 / 15 / 16 / 18 /
  20 / 22–24** (51 size props).
- Added `aria-hidden="true"` to decorative icons (135 static tags plus dynamic
  icon slots in sidebars, snackbar, permissions and accounting cards).
- Icon-only controls keep `aria-label` on the button, not the icon.
- Dynamic icon components in maps received `aria-hidden` where the adjacent text
  already names the item.

Verification: `tsc -b` and `npm run build` pass; the only remaining `size` values
are 13/15/16/18/20/22/24, and no static Lucide icon lacks
`aria-hidden`/`aria-label`/`role`.

## PR 21 — Localized ARIA labels (`DS-044`)

- `Spinner` accepts `label?: string`; default is `common:loading` via
  `useTranslation("common")`.
- Added `loading`, `input.clearAmount`, `input.clearPercentage` and reused
  `modal.close` in all four locales (en/de/fr/pt).
- Amount and percentage clear buttons, legacy popover close and lock
  illustrations no longer hardcode English.
- Lock illustrations with no title are now `aria-hidden` instead of labelled
  “Locked”.
- Legal page table of contents keeps `aria-label="Contents"` because the legal
  document itself is English-only static content.

Verification: `tsc -b` and `npm run build` pass; all four `common.json` files
parse; no hardcoded English `aria-label` remains outside the legal page.

## PR 22 — Motion cleanup (`DS-036`, `DS-037`, `DS-041`)

- Removed all 11 `transition-all` uses: color chips use `transition-colors`,
  popovers/select/date popovers use `transition-[opacity,transform]`, progress
  bars use `transition-[width]`, correlation nodes use
  `transition-[border-color,box-shadow,opacity]`.
- Normalized 200/300/500ms timings to 180/220ms, so product UI uses only the
  canonical 120/150/180/220 set.
- Added `motion-reduce:transition-none` to the touched transitions.
- `side-panel.css`: added `prefers-reduced-motion` query for tabs.
- `Checkbox.module.css`: 180ms timings and a reduced-motion query.

Verification: `tsc -b` and `npm run build` pass; grep finds no `transition-all`
or disallowed `duration-*` class in product UI. The 4s status-page loop is
illustration-only.

## PR 23 — Reporting radii (`DS-024`)

Kept the reporting-only `24px`/`28px` card radii and documented the exception
with a DS-024 comment in each card:

- `CashflowBarsCard` — 28px
- `LiquidityCard` — 28px
- `MetricCard` — 24px
- `OverdueMobileList` — 28px
- `ReportsHero` — 28px
- `TimelineBucketsCard` — 24px

No visual or layout change. Operational UI continues to use `Card`
(`rounded-lg`/`rounded-xl`).

Verification: `tsc -b` and `npm run build` pass.

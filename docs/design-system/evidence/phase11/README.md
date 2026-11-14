# Phase 11 — Accounting setup consolidation

**Date**: 2026-11-14
**Features**: `spifex-back-end/specs/014-accounting-setup-ux-consolidation`, `spifex-front-end/specs/006-accounting-chart-setup-ux`

## Scope

- Accounting setup and overview are one page before activation.
- Profile configuration is no longer an accounting phase.
- The AI setup guide lives in a side panel and opens from Overview and the chart
  page. It is no longer listed in the Accounting sidebar.
- The Review guide is a side panel opened from Overview; the old
  `/accounting/reconciliation` route redirects. It is no longer in the sidebar.
- Accounting sidebar rows stay visible and locked until their prerequisite is
  met.
- AI Connections UI was removed from Business and Personal settings.
- The Accounting correlation explorer was removed; old links redirect to
  Overview.
- All product-tour configuration, components, usage, data attributes and
  translation keys were removed.
- Only the business starter template remains.
- The chart page keeps a compact related-configuration row for Books, Category
  rules and Bank connections, and no longer dumps all setup modes at once.
- Questions with an `Other` option require a mandatory explanation.
- The AI country answer uses the shared Personal Settings country list,
  localised and searchable, with the workspace country preselected.
- Unfinished AI answers stay in browser session storage. Closing with progress
  asks **Keep scratch** or **Discard answers**; no database writes occur.
- Chart setup was rebuilt with icon method cards, a single active panel and
  cancel support.
- Manual paste includes a multi-line example, a copyable base structure and a
  live validator for headers, rows, choices, duplicates, parents and metadata.

## UX rules

- One notice per setup page; warnings are collapsed details in the AI preview.
- Overview after activation: trial balance, debit/credit totals, journal counts
  and recent journals.
- Stable loading: sidebar rows render disabled until setup status is known;
  chart AI actions wait for the chart load; overview uses skeleton regions.
- The AI wizard skips the expertise step when opened from a non-overview page.
- AI setup entry points are neutral, with an explicit icon/label gap.
- Manual submission is blocked while the paste validator reports errors.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| `check:accounting-i18n` | 449 keys verified |
| Backend `manage.py check` | Pass |
| Backend `makemigrations --check` | No changes |
| Backend AI-guide tests | 6 passed (`--keepdb`) |

## Screenshots

- `accounting-setup-overview.png` — pre-activation single setup page with one
  notice, three stable locked/unlocked steps and the AI setup action.
- `accounting-active-overview.png` — post-activation trial balance, journal KPIs
  and recent journals.

Authenticated browser verification of the side panels, clipboard and sidebar was
not possible in this session because no signed-in workspace was available.

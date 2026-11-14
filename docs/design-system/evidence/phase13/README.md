# Phase 13 — Accounting route, loading and Journals

**Date**: 2026-11-14
**Feature**: `spifex-front-end/specs/008-accounting-navigation-loading-journals`

## Scope

- Removed the duplicate setup step list; the configuration card grid is the only
  prerequisite list on the setup Overview.
- Renamed the chart route to `/accounting/chart-of-accounts`; the old path
  redirects. All sidebar, breadcrumb, guard, Overview and AI links were updated.
- Chart of accounts now shows a stable accounting skeleton until the first chart
  load completes. Later reloads keep the page mounted.
- Extracted `AccountingMetricCard` using the main Business Overview two-layer
  metric card. Active Overview and Journals use it.
- Active Overview typography, empty states and quick actions use the slate
  palette and shared panel treatment.
- Journals is blocked until accounting is operational.
- Journals page refactored into header, four metrics, filters, titled list panel
  and cleaned manual-journal panel.

## UX rules

- One setup prerequisite list only.
- Old chart bookmarks redirect; all new links use `chart-of-accounts`.
- Initial chart loading never flashes Related setup or empty-state content.
- Metric cards use the main Overview two-layer surface.
- Journal metrics describe the visible search slice.
- Operational-only pages are locked before activation.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| `check:accounting-i18n` | 479 keys verified |

## Notes

Authenticated browser verification was unavailable without a signed-in
workspace. The broader backend suite remains blocked by the existing
`banking.0014_import_categories` test-database migration error.

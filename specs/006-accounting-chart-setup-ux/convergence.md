# Convergence: Accounting chart setup UX

**Feature**: `006-accounting-chart-setup-ux`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Remove every tour | Done | `src/shared/ui/ProductTour` deleted; no `ProductTour`, `data-tour`, `takeTour` or tour keys remain. |
| FR-002 Sidebar cleanup | Done | `AccountingSidebar` lists Overview, Journals and configuration pages only; Review guide opens from Overview and AI setup from Overview/chart. |
| FR-003 Neutral AI actions | Done | Outline entry buttons and black wizard actions; explicit `gap-2`. |
| FR-004 Shared country list | Done | `QuestionField` option override renders `getCountries()` values. |
| FR-005 Workspace country mapping | Done | Two-letter `defaults.country` resolves to the localized label. |
| FR-006 Scratch storage only | Done | `AccountingAiSetupScratch` uses `sessionStorage`; no API call. |
| FR-007 Keep/discard confirmation | Done | Provider shows a close prompt when meaningful answers exist; discard clears scratch; keep preserves it. |
| FR-008 Chart setup refactor | Done | `ChartImport` now uses icon radio cards and one active panel with cancel. |
| FR-009 Manual tooling | Done | Example placeholder, copyable base structure with feedback and live inspector. |
| FR-010 Localisation | Done | 449 keys verified in en, pt, fr and de. |
| FR-011 Preserve routes/permissions/payloads | Done | No route, permission or API payload changes; existing import calls reused. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |
| `npm run check:accounting-i18n` | 449 keys |
| Backend `manage.py check` | Pass |
| Backend `makemigrations --check --dry-run` | No changes |
| Backend AI-guide tests | 6 passed (`--keepdb`) |

## Notes and Risks

- Authenticated browser verification was unavailable without a signed-in
  workspace. Side-panel close behaviour, clipboard access and responsive layout
  were reviewed statically and through the production build.
- The paste validator intentionally treats parent references outside the pasted
  rows as warnings because manual imports can attach to existing accounts.
- The broader backend suite remains blocked by the pre-existing
  `banking.0014_import_categories` test-database migration error.
- Scratch data is session-scoped and is never sent to the backend unless the user
  generates and applies a setup.

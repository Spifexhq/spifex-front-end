# Convergence: Accounting Overview refactor

**Feature**: `007-accounting-overview-refactor`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Single Add account | Done | Empty onboarding card and populated top toolbar are mutually exclusive. |
| FR-002 Remove bottom row | Done | Bottom description/actions row deleted; More actions moved to the top toolbar. |
| FR-003 Setup composition | Done | Status pill, next-action hero, progress, issues and configuration cards. The short step list was later removed by `008`; the configuration grid is the single prerequisite list. |
| FR-004 Prerequisite sequence | Done | Next action resolves workspace settings → chart → books → activation. |
| FR-005 Neutral AI action | Done | Outline AI button only while the chart is incomplete and the profile is ready. |
| FR-006 Issue links | Done | `IssueList` maps chart/books/review steps to routes. |
| FR-007 Operational composition | Done | Metrics, trial-balance table with totals, journals, error/retry and quick actions. |
| FR-008 No routing/API changes | Done | Existing endpoints, routes and permissions reused. |
| FR-009 Localisation | Done | 472 keys verified in en, pt, fr and de. |
| FR-010 Responsive and design system | Done | Responsive grids, shared `Card`, compact type scale and tabular money. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |
| `npm run check:accounting-i18n` | 472 keys |
| Backend `manage.py check` | Unchanged by this feature |
| Backend AI-guide tests | Unchanged by this feature |

## Notes and Risks

- Authenticated browser verification was unavailable without a signed-in
  workspace; layout and state branches were reviewed statically and through the
  production build.
- A single trial/journal request failure shows the error state rather than
  partial figures.
- The trial-balance preview shows up to eight accounts and states how many were
  hidden; totals always reflect the full response.

# Convergence: Accounting navigation, loading and Journals

**Feature**: `008-accounting-navigation-loading-journals`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Single setup list | Done | `SetupProgress` removed; configuration cards are the only prerequisite list. |
| FR-002 Chart route rename | Done | `/accounting/chart-of-accounts` route; `/accounting/chart` redirect. |
| FR-003 Update links | Done | Sidebar, breadcrumbs, guard, Overview, AI target and settings redirects updated. |
| FR-004 Stable chart loading | Done | `ready` gate plus accounting page skeleton; later reloads stay mounted. |
| FR-005 Shared metric card | Done | `AccountingMetricCard` two-layer surface used by active Overview and Journals. |
| FR-006 Overview alignment | Done | Slate palette, typography and panel treatment match the main Business Overview. |
| FR-007 Journals blocked | Done | Guard and sidebar require `status.operational`; page has a defensive blocked card. |
| FR-008 Journals refactor | Done | Header, four metrics, filters, titled list panel, retry, lines column, cleaned modal. |
| FR-009 Localisation | Done | 479 keys verified in en, pt, fr and de. |
| FR-010 No API/permission change | Done | Existing endpoints and permissions reused. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |
| `npm run check:accounting-i18n` | 479 keys |

## Notes and Risks

- Authenticated browser verification was unavailable without a signed-in
  workspace. Loading states and both Overview branches were reviewed statically
  and through the production build.
- Journal metrics describe the currently visible search slice, as documented in
  the existing metric captions.
- The old chart URL remains as a redirect for bookmarks.

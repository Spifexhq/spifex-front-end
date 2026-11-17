# Convergence: Overview blank after workspace switch

**Feature**: `015-workspace-switch-overview-race`
**Date**: 2026-11-17

## Completed

- HTTP cache invalidation no longer cancels same-identity reads in flight.
- Auth generation and selected workspace changes still cancel superseded reads.
- Overview retries cancelled reads up to two times.
- Overview payload arrays and chart point values are normalized.
- Empty chart series do not mount Recharts geometry.
- Sparkline ignores non-finite or missing values.

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b` | Pass |
| Scoped ESLint | Pass |
| Production build | Pass |

## Remaining risk

The workspace-switch race depends on timing between auth refresh, LiveSync
connection events and the overview request. The fix is deterministic in the HTTP
layer, but the original issue is best re-confirmed in a browser by switching
between workspaces with different permissions repeatedly.

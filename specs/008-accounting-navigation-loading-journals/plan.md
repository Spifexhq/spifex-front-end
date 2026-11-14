# Implementation Plan: Accounting navigation, loading and Journals

**Branch**: `008-accounting-navigation-loading-journals` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Remove the duplicate setup step list, move the chart route to `chart-of-accounts`, hold the chart page behind a stable initial skeleton, align active Overview cards with the main Business Overview, and rebuild Journals with a blocked pre-activation state and operational metrics.

## Technical Context

- React + TypeScript + Vite.
- Shared UI: `Card`, `Button`, `PageSkeleton`, `SkeletonLine`, `DataTable`.
- Setup guard: `accountingRouteAllowed` + `AccountingRouteGuard`.
- Chart data: `useChartAccounts`.
- Journal data: `useAccountingSource("journals")` + `useRecordFilters`.
- No backend contract changes.

## Design Decisions

1. **Setup list** — delete `SetupProgress`; the configuration grid is the single prerequisite list.
2. **Route** — canonical `/accounting/chart-of-accounts`; legacy `/accounting/chart` redirects. Update sidebar, breadcrumb map, guard and AI target.
3. **Chart loading** — local `ready` flag waits for the first `useChartAccounts` load; later reloads keep the page mounted. The route guard and chart page use the same `accounting` skeleton.
4. **Metric cards** — extract `AccountingMetricCard` using the main Overview two-layer surface; use in active Overview and Journals.
5. **Overview palette** — active Overview uses `slate` surfaces, typography and dashed empty states; setup keeps its existing surface.
6. **Journals access** — `accountingRouteAllowed` requires `status.operational`; the page also renders a defensive blocked card.
7. **Journals composition** — header with manual journal action, four metrics, filters outside the list card, list inside a titled `Card`, error retry and cleaned modal sections.

## Validation

- `npx tsc -b`
- `npm run lint`
- `npm run check:accounting-i18n`
- `npm run build`
- Responsive review of the setup, active Overview and Journals pages.

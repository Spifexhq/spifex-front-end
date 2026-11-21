# Tasks: Shared PriceChart

**Feature**: `017-price-chart`

## Phase 1 â€” Component

- [x] T001 Create `src/shared/ui/PriceChart/types.ts` with `PricePoint`, `PriceRange`, `PriceChartTone`, `PriceChartLabels`, `PriceChartProps`.
- [x] T002 Create `src/shared/ui/PriceChart/geometry.ts`: `buildModel` (phase split, shared boundary, domain padding, last/regular/after-hours values), `volumePath`, `compactNumber`.
- [x] T003 Create `src/shared/ui/PriceChart/PriceChart.tsx`: tone tokens, identity row, price/delta/third line, Recharts areas, volume strip, range pills, overlay hover index, empty state, reduced motion.
- [x] T004 Create `src/shared/ui/PriceChart/index.ts` re-exports.

## Phase 2 â€” Reporting adoption

- [x] T005 Create `components/CashTrajectoryChart.tsx` adapting `lineRanges` (`labels`/`data`) to `PriceRange[]`, rendering the card, chart and inflow/outflow/context footer.
- [x] T006 Replace `AnimatedRangeLineChart` usage in `Reports/index.tsx`; keep title, subtitle and stats identical.
- [x] T007 Add `charts.noData` to en/pt/fr/de `reports.json`.

## Phase 3 â€” Validation

- [x] T008 `npx tsc -b --pretty false`
- [x] T009 `npm run lint`
- [x] T010 `npm run build`
- [x] T011 Visual check at 360/768/1440 px, hover, range switch, reduced motion.
- [x] T012 Write `convergence.md` with exact results and remaining risks.

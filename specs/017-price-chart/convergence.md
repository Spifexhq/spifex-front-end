# Convergence: Shared PriceChart

**Feature**: `017-price-chart`
**Date**: 2026-11-20
**Status**: Implemented

## What shipped

| Task | Result |
| --- | --- |
| T001 `types.ts` | Done |
| T002 `geometry.ts` | Done — `buildModel`, `hasVolume`, `volumePath`, `compactNumber` |
| T003 `PriceChart.tsx` | Done — header, plot, volume strip, pills, hover index, empty state, reduced motion |
| T004 `index.ts` | Done |
| T005 `CashTrajectoryChart.tsx` | Done |
| T006 `Reports/index.tsx` swap | Done |
| T007 `charts.noData` in en/pt/fr/de | Done |
| T008 `tsc -b` | Pass |
| T009 `eslint` on changed files | Pass, 0 warnings |
| T010 `npm run build` | Pass, exit 0, built in 24.9 s |
| T011 Visual + interaction check | Done (see below) |
| T012 Convergence notes | This file |

## Reference parity, verified against the live widget

Measured directly on `x.com` with the in-app browser before implementing, then re-checked on a temporary preview harness (deleted afterwards) at 749 px and 360 px:

| Behaviour | Reference | Implementation |
| --- | --- | --- |
| Plot | 598×151, full-bleed, no axes/grid/labels | 151 px, full-bleed, `XAxis`/`YAxis` hidden, 4 px top margin |
| Volume strip | 35 px, bars `#595D62`, ~54 % duty | 35 px, `volumePath` with `0.54 × pitch`, bar colour from the tone |
| Range pills | 5 equal columns, 3 px gap, 32 px, radius 9999 | Identical (`flex-1`, `gap-[3px]`, `h-8`, `rounded-full`) |
| Active pill (dark) | `#2A2D30` bg, `#E7E9EA` text | Identical |
| Hover dot | r = 4, line colour, snaps to nearest sample | Identical; verified `cx` matches the hovered sample |
| Tooltip | None | None |
| Header on hover | Price + delta + `date · Volume n` | Verified: `$96.04` / `Nov 20, 2026 at 11:29 AM · Volume 1.6M` |
| Header on leave | Latest price + `After hours $x (+y%)` | Verified: `$89.03` / `After hours $89.03 (+1.11%)` |
| Range change | Remount + left→right clip reveal | Verified clip widths 20 → 214 → 502 → 718 over ~300 ms (reference: 23 → 443 → 584 over ~300 ms) |
| Volume reveal | 250 ms from baseline | `motion.svg` `scaleY(0) → 1`, 250 ms ease-out |
| Empty range | Header + `No chart data to display` | Header + localized `charts.noData` |

## Deviations from the reference

1. **Trailing plot gap.** X leaves ~17 % empty space at the right because the trading day has not finished; the line stops at "now" and the dot stays fully visible. Our data is historical, so the series stretches to the edge. A 6 px right margin is applied only when the range splits into an after-hours session, so the resting dot is not clipped.
2. **Light palette is derived.** Dark colours were measured (`#E7E9EA`, `#71767B`, `#2A2D30`, `#595D62`, `#F4212E`). Light values use the X light tokens (`#0F1419`, `#536471`, `#EFF3F4`, `#CFD9DE`) and were not measured, because switching the signed-in account's theme was out of scope.
3. **Up colour inferred.** Every ticker available in the session was negative, so `#00BA7C` follows the X token set rather than a direct observation.
4. **Identity row spacing.** Name → meta gap is 2 px instead of the measured 3 px; not perceptible at 13/16 px type.
5. **Reporting has no volume.** The cash-trajectory card renders without the volume strip (`showVolume={false}`), because cashflow data has no volume series.

## Risks / follow-ups

- `AnimatedRangeLineChart.tsx` is now unused but intentionally left in place (no deletion of existing work).
- Reporting was not exercised against a live authenticated session; the adapter is covered by TypeScript only. It should be eyeballed once on a populated workspace.
- `PriceChart` is generic enough for the Personal overview later; the same call pattern applies with `tone="light"`.

## Extension — 2026-11-21

`018-overview-cashflow-trend` extended this component without changing behaviour described above: overlay `lines`, external `tabs`, `titleAside`, `detailFormatter`, `animateNumbers`, and an optional `duration` on `AnimatedNumber`. See `specs/018-overview-cashflow-trend/`.

## Superseded for Business — 2026-11-21

`019-business-cashflow-forecast` replaced the Business Overview trend with the hand-rolled `CashFlowTrend` forecast (due/projected modes, forward windows, morphing paths). `PriceChart` is now only used by Personal Overview through `FinancialCharts`, and the Reporting card that originally motivated it (`CashTrajectoryChart`) was deleted with the Reports page.


## Changed paths

```
src/shared/ui/PriceChart/types.ts
src/shared/ui/PriceChart/geometry.ts
src/shared/ui/PriceChart/PriceChart.tsx
src/shared/ui/PriceChart/index.ts
src/products/business/pages/Reporting/Reports/components/CashTrajectoryChart.tsx
src/products/business/pages/Reporting/Reports/index.tsx
src/lib/i18n/locales/en/reports.json
src/lib/i18n/locales/pt/reports.json
src/lib/i18n/locales/fr/reports.json
src/lib/i18n/locales/de/reports.json
specs/017-price-chart/{spec,plan,tasks,convergence}.md
```

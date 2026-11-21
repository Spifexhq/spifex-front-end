# Convergence: Overview cash-flow trend

**Feature**: `018-overview-cashflow-trend`
**Date**: 2026-11-21
**Status**: Implemented

## Results

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npx eslint src/shared/ui/PriceChart src/shared/ui/AnimatedNumber src/shared/financial/components/FinancialCharts` | Pass, 0 warnings |
| `npm run build` | Pass, exit 0, built in 14.6 s |

## Verified behaviour (temporary preview harness, removed after the check)

- Header renders the cumulative net (`US$ 84.600,00`), the delta versus the previous period (`US$ 20.000,00 / +30,96 %`) and the last bucket date.
- Hover at ~55 % of the plot: header switches to that bucket and the third line becomes `01/07/2026 · Dinheiro recebido US$ 22.100,00 · Dinheiro pago US$ 13.200,00`.
- Leaving restores the period values.
- Group pill: pressing `Diário` flips `aria-pressed` and moves the active background; the row is three equal columns, radius-full, 32 px.
- Receipts (`#6366F1`) and payments (`#94A3B8`) render as 2 px stroke-only lines over the net area, and the domain grows to fit them.
- Numbers interpolate: the price passes through intermediate values before settling (checked with transitions enabled and disabled to separate the animation from the environment's throttled frames).
- The first screenshot after a reload caught the reveal at 0 width; the chart draws immediately after (`~300 ms` clip reveal, unchanged from `017`).

## Deviations

- The Overview card keeps its 260 px plot height instead of the widget's 151 px, because the card already had a taller plot and the grid is unchanged.
- The delta reference is the previous period net (falling back to the first bucket), which is the closest analogue of X's "previous close" for cash flow.
- Period net is drawn as the primary area and the side series as lines; the reference widget has only one series. This is required to keep receipts and payments visible.

## Risks / follow-ups

- Overview was verified against a static fixture, not a live workspace. Timeframe switching relies on the existing refetch; while the request is in flight the chart remounts with the previous points and then updates.
- `AnimatedNumber` renders an `sr-only` twin, so `innerText` contains the value twice; screen exposure is unchanged.
- The shared PriceChart chunk now carries Recharts for both Overview and Reporting.

## Changed paths

```
src/shared/ui/PriceChart/types.ts
src/shared/ui/PriceChart/geometry.ts
src/shared/ui/PriceChart/PriceChart.tsx
src/shared/ui/PriceChart/index.ts
src/shared/ui/AnimatedNumber/index.tsx
src/shared/financial/components/FinancialCharts/index.tsx
specs/018-overview-cashflow-trend/{spec,plan,tasks,convergence}.md
```

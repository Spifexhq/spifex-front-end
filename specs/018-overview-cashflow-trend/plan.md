# Implementation Plan: Overview cash-flow trend

**Feature**: `018-overview-cashflow-trend`
**Depends on**: `017-price-chart`, `AnimatedNumber`

## Changes

### 1. `PriceChart` — additive API

| Prop | Purpose |
| --- | --- |
| `lines?: PriceLineSeries[]` | Extra `Area` elements with `fill="none"`, 2 px, animated with the primary series |
| `tabs?` / `tab?` / `onTabChange?` / `tabsLabel?` | Pill row driven by an external control instead of the data ranges |
| `titleAside?: ReactNode` | Renders beside the truncated title (info tooltip) |
| `detailFormatter?(index)` | Overrides the hover third line |
| `animateNumbers?: boolean` | Defaults to `true` |

`onRangeChange` became optional, because `tabs` can replace it.

Row shape: overlay values are attached as `line_<key>` on the chart rows, so one dataset keeps all series aligned by index.

Domain: `buildModel` now returns the raw min/max; the component merges overlay values and applies `padDomain` once (same 2 % rule as before).

### 2. `AnimatedNumber` — optional duration

`duration?: number` (default `0.45`) so hover-driven numbers settle quickly (`0.2`) without changing existing call sites.

### 3. `FinancialCharts` — trend card

- Net series accumulates in minor units (unchanged) and feeds `PriceChart`.
- Receipts (`#6366F1`) and payments (`#94A3B8`) are overlay lines.
- Period net keeps `#00BA7C` / `#F4212E` by sign.
- Group pills replace `SegmentedControl`; `onGroup` is still the only callback.
- Header delta references `data.previous.net` when available.
- `detailFormatter` prints `date · receipts · payments` for the hovered bucket.
- Legend row keeps the same labels, tooltip and currency, plus the net swatch.
- Card switches to `padding="none"` + `overflow-hidden` so the plot stays full-bleed.
- Empty state: no activity renders the localized `noActivity` message through the chart.

## Validation

1. `npx tsc -b --pretty false`
2. `npx eslint` on the three touched areas
3. `npm run build`

## Risks

- The chart now shares the Recharts chunk with Reporting, which is the intended consolidation.
- Animated header numbers add three `MotionValue`s per chart; negligible.
- `AnimatedNumber` keeps its `sr-only` twin, so the accessible text repeats the value beside the animated one by design.

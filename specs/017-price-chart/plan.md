# Implementation Plan: Shared PriceChart

**Feature**: `017-price-chart`
**Depends on**: `recharts@^3.1.0`, `framer-motion` (reduced-motion only)

## Summary

Add `src/shared/ui/PriceChart/` as a self-contained, presentational financial chart that mirrors the measured X cashtag widget, then swap the Reporting "Cash trajectory" card onto it through a thin adapter component. The previous `AnimatedRangeLineChart` implementation stays in place untouched (no consumer left, kept as user work).

## Technical context

- React 18, TypeScript 5.6, Tailwind 4 utility classes, Recharts 3.
- The reference widget is itself Recharts, so curve generation, clip reveal and tooltip-axis snapping are reproduced by the same engine instead of being re-implemented in hand-written SVG.
- No global state, no data fetching, no new dependency.

## Design decisions

### D1 — Recharts, not hand-rolled SVG

The reporting charts are hand-written SVG (700+ lines each) because they needed custom morph/spring behaviour. The X widget's motion is Recharts' mount animation, so using Recharts gives byte-level parity for the reveal with far less code.

### D2 — Explicit two-series split for the 1D after-hours segment

A single dataset carries `regular` and `after-hours` keys; both areas share the x axis and the boundary value, exactly as measured (the after-hours path starts at the previous close value, not at its own first value).

### D3 — Overlay-driven hover index

X renders a `ReferenceDot` and updates the header from an active index. We compute the index from pointer x over the plot (`round(ratio * (n - 1))`), which snaps identically without depending on Recharts' tooltip machinery. No `Tooltip` element is rendered at all.

### D4 — Tone tokens as CSS custom properties

`tone="light" | "dark"` sets `--pc-*` variables on the root element; every child reads them. Callers can override `upColor`/`downColor` without touching the token map.

| Token | light | dark (measured) |
| --- | --- | --- |
| surface | `#FFFFFF` | `#000000` |
| text | `#0F1419` | `#E7E9EA` |
| muted | `#536471` | `#71767B` |
| pill active bg | `#EFF3F4` | `#2A2D30` |
| pill inactive text | `#536471` | `#71767B` |
| after-hours | `#8B98A5` | `#595D62` |
| volume | `#CFD9DE` | `#595D62` |
| border | `#EFF3F4` | `#2F3336` |
| up / down | `#00BA7C` / `#F4212E` | `#00BA7C` / `#F4212E` |

### D5 — Geometry

- Plot height 151 px, volume 35 px, no margin except 4 px top.
- Y domain `[min - 2% of range, max + 2% of range]`; flat series fall back to a ±1 window.
- Volume bars: one per point, pitch `1000 / n`, width `0.54 × pitch`, height proportional to the maximum, drawn at the strip baseline.

## Data contract

```ts
type PricePoint = { t: string | number | Date; value: number; phase?: "regular" | "after-hours"; volume?: number | null };
type PriceRange = { key: string; label: string; points: PricePoint[]; reference?: number };
```

Header semantics: `change = activePoint.value - reference`, where `reference` is `range.reference ?? props.reference ?? firstPoint.value`. Percentage is omitted when the reference is zero.

## File plan

| Path | Change |
| --- | --- |
| `src/shared/ui/PriceChart/types.ts` | new — public types |
| `src/shared/ui/PriceChart/geometry.ts` | new — series split, domain, volume path, compact formatting |
| `src/shared/ui/PriceChart/PriceChart.tsx` | new — header, plot, volume strip, pills, hover state |
| `src/shared/ui/PriceChart/index.ts` | new — re-exports |
| `src/products/business/pages/Reporting/Reports/components/CashTrajectoryChart.tsx` | new — adapter card |
| `src/products/business/pages/Reporting/Reports/index.tsx` | swap `AnimatedRangeLineChart` for `CashTrajectoryChart` |
| `src/lib/i18n/locales/{en,pt,fr,de}/reports.json` | add `charts.noData` |

## Validation

1. `npx tsc -b --pretty false`
2. `npm run lint`
3. `npm run build`
4. Manual: hover, leave, range switch, 360/768/1440 px, reduced motion.

## Risks

- Recharts re-mount animation duration differs from the measured ~300 ms if `animationDuration` is not set per series; pinned explicitly.
- Light-theme token values are derived, not measured (see spec assumptions).
- Reporting currently passes `labels + data`; the adapter must preserve the change-versus-first-point semantics of the old chart.

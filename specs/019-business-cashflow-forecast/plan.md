# Implementation Plan: Business cash-flow forecast chart

**Feature**: `019-business-cashflow-forecast`

## 1. Chart engine

`CashFlowTrend/geometry.ts`

- `resample(values, 96)` — linear resample to a fixed length so every path has the same number of segments.
- `linePath()` — Fritsch–Carlson monotone cubic, emitted as `M` + 95 `C` commands with two decimals.
- `areaPath()` — the line plus two closing points and `Z`.
- `paddedDomain()` — 12 % breathing room.
- `cumulative()`, `indexFromRatio()`.

Why hand-rolled: Recharts re-mounts a series and clips it in; it cannot interpolate between two datasets. A fixed-length path lets framer-motion animate `d` directly, which is what produces the Coinbase-style morph.

## 2. Data

`CashFlowTrend/useCashFlowForecast.ts`

- Requests `cashflow/overview/` with `basis="planned"`, `start_date=today`, `end_date=today+N-1`, `group_by` from the range, plus the page's category/description filters.
- Keeps the previous payload while loading so the chart morphs from old to new instead of flashing.
- Requests `banking/table` for `total_consolidated_balance`; returns `opening: null` when `can_view_balance === false` or `mixed_currencies === true`.
- Stale responses are discarded with a request counter.

## 3. Component

`CashFlowTrend/index.tsx`

- `CashFlowTrendView` is presentational (buckets, opening, currency, window, callbacks); `CashFlowTrend` is the data container. The view is what a preview or a test can render without a backend.
- Local state: mode (`due`/`projected`), visible series (`receivables`, `paid`, `net`), range key (lifted to the container), hover index.
- Series build: due → per-bucket in/out/net; projected → balance + cumulative in/out/net.
- Primary series fills a vertical gradient; the others are 2.4 px strokes; net is 1.8 px dashed.
- Crosshair: `motion.line` + `motion.circle` with `HOVER_SPRING`; tooltip is an HTML card animated with `AnimatePresence`.
- Reduced motion collapses springs to `duration: 0`.
- Copy comes from the `overview` namespace under `trendCard.*`.

## 4. Design-system fit

- `Card tone="slate" radius="xl" padding="none"` with full-bleed plot.
- `SegmentedControl` for Due/Projected, `InfoTooltip` for the method, `Button` for retry.
- Colours: receivables `#10B981`, paid `#94A3B8`, net `#0EA5E9`, balance `#4F46E5`.
- Type scale: 11 px caption, 32 px headline, 12 px meta, 11 px chips and pills.

## 5. Page composition

- `Overview/index.tsx` renders `CashFlowTrend` + `SpendingByCategory` in the existing two-column grid.
- `SpendingByCategory` was extracted from `FinancialCharts` so Business and Personal share it without sharing the chart.
- Personal keeps `FinancialCharts` (PriceChart) untouched.

## 6. Reports removal

| Removed | Why |
| --- | --- |
| `pages/Reporting/` | Page plus its 12 local components |
| `business/routes` entry + lazy import | Route deleted (catch-all redirects to Overview) |
| `SidebarNavigation` entry, icon, auth destructuring | No subscription-gated Reports link |
| `models/components/reports.ts`, `api.getReportsSummary` | Only the page used them |
| `locales/*/reports.json`, i18n registration | Namespace no longer exists |
| `navbar.links.reports`, `navbar.pages.reports`, page-title mapping | Keys unused after the entry was removed |

Backend `cashflow/reports/` stays untouched (API contract, possible external consumers). RBAC `view_report_page` stays (permission taxonomy and backend tests still reference it).

## 7. Validation

1. `npx tsc -b`
2. `npx eslint` on touched areas
3. `npm run build`; confirm no Reports chunk
4. Preview harness with fixtures: morph sampling, hover tooltip, toggles, modes

## Risks

- The projection assumes the consolidated balance is meaningful in one currency; mixed currencies disable the tab rather than guess.
- A 1Y window grouped by month gives 13 buckets; the path is fine but the tooltip is bucket-level, not daily.
- The chart ignores the page date filter by design; the card always prints its own window.

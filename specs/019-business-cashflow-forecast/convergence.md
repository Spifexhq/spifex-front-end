# Convergence: Business cash-flow forecast chart

**Feature**: `019-business-cashflow-forecast`
**Date**: 2026-11-21
**Status**: Implemented

## Results

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npx eslint` on Overview, SpendingByCategory, FinancialCharts, routes, sidebar, requests, i18n | Pass, 0 warnings |
| `npm run build` | Pass, exit 0, 38.1 s |
| `dist` chunk audit | No `Reporting`, `Reports` or `CashTrajectory` chunks |

## Verified in the preview harness (deleted afterwards)

- Due mode renders receivables (emerald, filled), paid (slate) and the dashed net line; toggling net refits the domain.
- Projected mode renders the balance (indigo, filled) between cumulative receivables and payments; the headline is the projected balance and the sub-line the movement versus today.
- Hover at 55 % of the plot showed the crosshair, three markers and the tooltip:
  `07/12/2026 · Saldo projetado US$ 65.540,00 · A receber US$ 61.410,00 · Pago US$ 44.120,00`.
- Window change 30D → 90D sampled the first path `d` every ~55 ms:
  `148.64 → 142.60 → 136.34 → 132.32 → 129.39 → 127.48 → 126.28`, i.e. a real interpolation, not a snap or a re-mount.
- Date ticks under the plot show first / middle / last bucket.
- Copy rendered in pt-BR from the `overview` namespace.

## Not verified

- The real Overview page against a live workspace. The forecast request reuses the existing `cashflow/overview/` parameters, but the extra `banking/table` call and the disabled Projected state were not exercised with real permissions.
- Mixed-currency and no-balance-permission orgs (Projected should be disabled; code path reviewed, not executed).

## Deviations from the request

- Range pills are **forward** windows (7D/30D/90D/1Y) with the exact dates printed under the headline, per the confirmed product choice. The wording "last" became "next" in behaviour; the card states the range explicitly.
- Overdue entries are outside the forward window, so they do not appear in this card; they remain in the page's attention list.
- The projection reads the consolidated balance from the banking table endpoint instead of summing the overview's eight-account list, because that list is truncated and may mix currencies.
- The 1Y window groups by month (13 buckets), so tooltips are monthly there.

## Cleanup performed

Deleted: `products/business/pages/Reporting/**` (page, `AnimatedRangeLineChart`, `AnimatedSplitBarsChart`, `TrendOverviewChart`, `CashTrajectoryChart`, cards and helpers), `models/components/reports.ts`, `api.getReportsSummary`, `locales/*/reports.json`, the `reports` i18n registration, the Business route, the sidebar entry and its now-unused icon/auth state, `navbar.links.reports`, `navbar.pages.reports`, and the `reports` entry in the navbar page-title map.

Kept on purpose: the backend `cashflow/reports/` app and the `view_report_page` permission (API contract and RBAC taxonomy).

## Risks

- `PriceChart` (specs 017/018) is now used only by Personal Overview; its Reporting consumer is gone.
- The card issues two requests per window change (overview + banking). The banking call is not repeated per window, only on mount and retry.
- `getBanksTable` may be plan-gated; on failure the Projected tab is disabled rather than showing a partial balance.

## Changed paths

```
src/products/business/pages/Overview/CashFlowTrend/{index.tsx,geometry.ts,useCashFlowForecast.ts}
src/products/business/pages/Overview/index.tsx
src/shared/financial/components/SpendingByCategory/index.tsx
src/shared/financial/components/FinancialCharts/index.tsx
src/products/business/routes/index.tsx
src/products/business/components/Sidebar/SidebarNavigation.tsx
src/shared/layout/Navbar/pageTitle.ts
src/core/api/requests.ts
src/lib/i18n/index.ts
src/lib/i18n/locales/*/overview.json
src/lib/i18n/locales/*/navbar.json
deleted: src/products/business/pages/Reporting/**, src/models/components/reports.ts, src/lib/i18n/locales/*/reports.json
specs/019-business-cashflow-forecast/{spec,plan,tasks,convergence}.md
```

---

# Revision 2 convergence — 2026-11-21

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npx eslint src/products/business/pages/Overview` | Pass, 0 warnings |
| `npm run build` | Pass, exit 0, 29.0 s |

## Verified

- Daily buckets for 30D (30 points) and 1Y (365 points) with 12 localized ticks (`21 de nov.` … `20 de nov.`).
- Hover: split coloring with the muted `#CBD5E1` tail, the date pill `sex., 4 de dez. de 2026`, and header values switching to the hovered day (`US$ 359,00` / `2.730` / `2.371`).
- Leave: clip widths `239 → 389 → 599 → 696 → 736 → 753 → 760 → 766` px — the color fills back fluidly.
- Mode switch: two groups at `0.69/0.31 → 0.33/0.67 → 0.12/0.88 → 0/1` opacity, then one; no floating paths, hover reset.
- Paid line and chip swatch are `#B42318`.
- Overview metric row shows three cards (Receipts, Payments, Net cash flow) after removing the Transactions card.

## Not verified

- Real workspace data and the mobile breakpoint (ticks drop to 5 under 480 px by width; not exercised in a browser at that width).
- The 1Y request payload size for a workspace with very dense daily entries (365 buckets of small objects; expected to stay modest).

## Follow-ups

- The hovered day's headline keeps the "Net due" caption; if the hover state needs its own label, add a `trendCard.hoverCaption` key.

---

# Revision 3 convergence — 2026-11-21

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npx eslint src/products/business/pages/Overview` | Pass, 0 warnings |
| `npm run build` | Pass, exit 0, 28.5 s |
| Browser console | No errors (the earlier `<path> d: undefined` warning is fixed) |

## Verified

- Edge labels: first tick starts at `PAD = 18 px`, last tick ends at `width − 18 px`; nothing is clipped.
- Darker green `#047857` on the line, the chip swatch and the area gradient.
- Receivables toggle: area `d` unchanged while opacity `1 → 0.45 → 0.05 → 0`; toggling back morphs the frozen shape and fades in.
- Due → Projected: receivables path morph sampled every 90 ms (`107.23 → 129.95 → 163.45 → 187.90 → 205.09 → 215.78 → 222.38 → 232.97`), single plot group, balance fades in.
- 30D → 90D still morphs; hover split, crosshair and date pill stay aligned.

## Notes

- The area now represents receipts in both modes; in Projected the balance is a reference line without its own fill. This is intentional, so the gradient never changes hue mid-interaction.
- Mobile widths were not exercised in a browser, but the inset is a constant 18 px and ticks drop to 5 below 480 px.

---

# Revision 4 convergence — 2026-11-21

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npx eslint src/products/business/pages/Overview` | Pass, 0 warnings |
| `npm run build` | Pass, exit 0, 34.3 s |
| Console | No errors |

## Verified

- Default two lines render with no area path at all (not merely opacity 0).
- One line → gradient of that line's colour: green `#047857`, red `#B42318` or indigo `#4F46E5`.
- Refill spring `80/20/1`: `253 → 299 → 419 → 522 → 595 → 643 → 677 → 697 → 708` px at 80 ms steps, about twice the previous duration.
- Projected balance now paints grey after the hover point instead of disappearing.

## Notes

- The fill rule is "exactly one visible line", counting the projected balance. Two side lines in Projected (three with the balance) means no fill.
- The gradient colour is read from the single visible series, so no manual colour prop is needed.

---

# Revision 5 convergence — 2026-11-21

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npx eslint src/products/business/pages/Overview` | Pass, 0 warnings |
| `npm run build` | Pass, exit 0, 45.9 s |
| Console | No errors |

## Verified

- Gradient fully removed: zero `linearGradient` nodes, all paths `fill="none"`, in both modes and every toggles combination.
- Receivables colour is `#059669` on the line and the chip swatch.
- Projected mode renders a fourth chip ("Saldo projetado"); unselecting removes the indigo path and re-selecting restores it.
- 1Y uses weekly buckets in the request; the fixture with 53 weekly points renders 9 fitted ticks instead of 12, with no overlap in pt-BR.

## Notes

- Hiding the projected balance does not change the headline number; the chip only controls the line.
- Tick fitting is an estimate based on character count; extreme locales may still need a manual cap.

---

# Revision 6 convergence — 2026-11-21

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npx eslint` on shared chart, business overview, personal page | Pass, 0 warnings |
| `npm run build` | Pass, exit 0, 20.8 s |
| Shared view render (fixture harness) | Identical to the Business version |

## What changed structurally

```
src/shared/financial/components/CashFlowTrend/
  index.tsx        view + container (load, filters)
  geometry.ts      resample / monotone path / ticks / domain
  types.ts         RangeKey, FORECAST_RANGES, ForecastLoader, ForecastPayload
  useForecast.ts   window calculation, stale-request guard, retry
```

- Business keeps only `useBusinessForecast.ts`; Personal only `usePersonalForecast.ts`. Both are module-level functions, so the shared hook's effect is stable.
- `FinancialCharts` was removed after the Personal migration.

## Not verified

- Personal Overview against a live workspace. The dashboard endpoint accepts the same query params (`basis`, `group_by`, dates, category, description) and returns `series` plus `available_balance`; the projection disables when `capabilities.banks` is false or `balances_by_currency` has more than one entry.

## Risks

- Personal chart copy comes from the `overview` i18n namespace (shared wording), not `personal`.
- `PriceChart` (specs 017/018) no longer has a consumer after this migration.

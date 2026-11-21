# Tasks: Overview cash-flow trend

- [x] T001 `PriceChart`: `lines` overlay series + shared domain (`buildModel` raw min/max, `padDomain` in component).
- [x] T002 `PriceChart`: `tabs`/`tab`/`onTabChange`/`tabsLabel` pill override; `onRangeChange` optional.
- [x] T003 `PriceChart`: `titleAside`, `detailFormatter`, `animateNumbers`.
- [x] T004 `AnimatedNumber`: optional `duration`.
- [x] T005 `PriceChart`: animate price, delta amount and delta percentage (`0.2 s`).
- [x] T006 `FinancialCharts`: rebuild the trend card on `PriceChart`, keep receipts/payments lines, legend, currency and empty state.
- [x] T007 Map day/week/month to the pill row and keep `onGroup` as the single callback.
- [x] T008 `tsc -b` pass.
- [x] T009 `eslint` pass on changed files.
- [x] T010 `npm run build` exit 0.
- [x] T011 Preview verification (hover, leave, group pill, animated numbers) with a temporary harness, then removed.
- [x] T012 Convergence notes.

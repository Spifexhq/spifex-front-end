# Tasks: Business cash-flow forecast chart

- [x] T001 `CashFlowTrend/geometry.ts` — resample, monotone path, area path, padded domain, cumulative, hover index.
- [x] T002 `CashFlowTrend/useCashFlowForecast.ts` — planned window request, stale-response guard, consolidated balance, retry.
- [x] T003 `CashFlowTrend/index.tsx` — view with modes, toggles, range pills, morphing paths, spring crosshair, tooltip, empty/loading/error states.
- [x] T004 Spring motion + `AnimatedNumber` headline; reduced-motion fallbacks.
- [x] T005 Forward windows 7D/30D/90D/1Y with day/week/month grouping.
- [x] T006 Series toggles (receivables, paid, dashed net) that refit the domain.
- [x] T007 Disable Projected when the consolidated balance is unavailable or mixed.
- [x] T008 Extract `SpendingByCategory` and compose Business Overview with `CashFlowTrend`.
- [x] T009 i18n `trendCard.*` in en/pt/fr/de.
- [x] T010 Delete Business Reports page and its local components.
- [x] T011 Remove route, sidebar entry, lazy import, unused icon/auth state.
- [x] T012 Remove reports models, API helper, i18n namespace and navbar keys.
- [x] T013 `tsc -b` pass.
- [x] T014 `eslint` pass on touched files.
- [x] T015 `npm run build` exit 0; no Reports chunk in `dist`.
- [x] T016 Preview verification: render, morph sampling, hover tooltip, toggles, modes.
- [x] T017 Convergence notes.

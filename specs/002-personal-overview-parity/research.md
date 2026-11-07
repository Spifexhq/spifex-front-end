# Targeted Research and Analysis

## Current composition

### Enterprise

`src/products/business/pages/Overview/index.tsx` renders a greeting and intro, then `OverviewFilters`, then an error/retry notice, summary metrics, shared `FinancialCharts`, and `OverviewActivity`. The filter panel is a separate block beneath the heading. Its toolbar holds basis, date presets and CSV export; the bordered form below holds date range, category, optional bank, search and Apply.

### Personal

`src/products/personal/pages/PersonalOverview.tsx` renders a title/description and date fields inside the header row. It then renders an Add Transaction action, four plain metric cards, shared charts, budget and goal cards, a recent-activity table, and an upcoming list. The page is shared by Overview and Reports via a `reports` prop.

## Data and reuse

- `PersonalDashboard` extends `OverviewData`: it has current and previous period totals plus the same time-series structure used by Business. It additionally supplies `available_balance`, balances by currency, budgets and goals.
- Income, expense and net metrics can have sparklines and prior-period deltas. Available balance is a current snapshot and must not be compared to prior period or presented as a time-series metric.
- `FinancialCharts` is already product-neutral and used in both pages.
- `OverviewMetrics` and `OverviewFilters` live in Business-owned folders. Direct imports into Personal would breach product boundaries. Extract only neutral presentation primitives into `shared/financial/components/Overview`.
- Keep query filtering product-specific. The shared filter component is a styled shell; date logic remains in Personal and all current category/bank/search logic remains in Enterprise.

## Risks and checks

- Date presets in Personal should use local calendar dates, matching `today()` and current endpoint expectations.
- Preserve draft-versus-applied date state; typed date edits do not fetch until Apply. Quick presets may submit immediately.
- Keep available balance visually aligned with metric cards while omitting comparison/sparkline data that the API does not provide.
- Keep the Add Transaction action hidden on Reports and read-only/deletion-pending workspaces.
- Do not modify Personal API parameters, business permissions, or backend response contracts.

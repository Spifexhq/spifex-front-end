# Implementation Plan: Personal Overview Visual Parity

**Branch**: `002-personal-overview-parity` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

## Summary

Bring the Personal Overview's page composition in line with Business Overview: move date controls into the filter-panel location under the heading, share the filter-panel surface and metric-card visual primitive, and preserve Personal-specific metrics, charts, budgets, goals and activity.

## Technical Context

**Language/Version**: TypeScript 5 / React 18  
**Primary Dependencies**: React Router, React i18next, Tailwind, existing shared financial UI  
**Storage**: None changed  
**Testing**: TypeScript, targeted ESLint, production build, static diff/translation checks; manual browser review if authenticated session is available  
**Target Platform**: Web desktop and mobile  
**Constraints**: No backend or data contract changes; keep Personal out of Business product modules; no new dependencies.

## Analysis Findings

- Business Overview order is greeting/description → `OverviewFilters` → error/status → metrics → financial charts → activity.
- Personal Overview currently places date fields/apply button in the header row, then a standalone add-transaction button, then flat KPI cards, chart, budgets/goals, recent list and upcoming list.
- PersonalDashboard extends shared `OverviewData`, including current/previous metrics and series. Personal has an available-balance snapshot that has no valid previous-period comparison.
- Business `OverviewMetrics` owns its presentation in a Business page module. Personal should not import that module; move the common metric-card presentation to shared financial UI and adapt both page-specific data compositions to it.
- Business filter fields are product-specific, so share the filter panel visual shell, not Business query/domain logic. Personal retains its date inputs and period presets.
- `FinancialCharts` is already shared and accepts the Personal dashboard data; keep its graph grouping control and behavior intact.

## Design Decisions

1. Add a neutral shared `OverviewFilterPanel` visual wrapper that provides the toolbar slot and bordered form surface. Use it in Business OverviewFilters and PersonalOverview's date filter form.
2. Add shared `OverviewMetricCards` presentation accepting typed metric items (label/value formatter/trend/delta). Refactor Business OverviewMetrics and PersonalOverview to feed it product-specific items.
3. For Personal, show available balance as a snapshot without a fabricated trend or prior-period delta. Use actual prior-period totals and series only for income, expense and net flow.
4. Move Add Transaction into the overview content/action area beneath filters and keep it Personal-only.
5. Keep Personal's responsive content and data composition, while applying Business surface, spacing and typography patterns to charts, progress cards and activity sections as needed.

## Implementation Sequence

1. Create the shared filter-panel shell and migrate Business OverviewFilters with no behavior change.
2. Create shared metric cards and migrate Business OverviewMetrics.
3. Recompose PersonalOverview header/filter/action order and connect Personal metric items to the shared card component.
4. Align Personal supporting cards and table sections with Business Overview surfaces and spacing without removing Personal-specific budgets/goals/activity.
5. Run TypeScript, targeted ESLint, build and diff checks; inspect responsive styles in source and browser if a session is available.

## Risks and Mitigations

- The Personal balance is not a period change metric. Keep it visually consistent but omit trend/comparison.
- Moving Business's presentation into shared UI could regress Business appearance. Keep existing classes unchanged and validate build.
- Personal reports reuse PersonalOverview with a prop. Maintain report-specific content and do not show normal overview-only actions in report mode.
- The date filter draft/apply flow must remain intact; quick presets may apply immediately as Business's do.

# Tasks: Personal Overview Visual Parity

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md)

## Phase 1: Shared presentation primitives

- [x] T001 [US1] Add the shared Overview filter-panel wrapper with toolbar and form slots, and migrate Business `OverviewFilters` without changing its filter behavior.
- [x] T002 [US1] Add shared metric-card grid presentation and migrate Business `OverviewMetrics` to it without changing card data or state.

## Phase 2: Personal Overview alignment

- [x] T003 [US1] Move Personal date controls from the heading into the shared filter-panel position and add Business-style quick-range toolbar controls while preserving applied-query behavior.
- [x] T004 [US1] Map Personal balance/income/expense/net data into shared metric cards; show sparklines and previous-period deltas only where supported.
- [x] T005 [US1] Align Personal Overview's action placement, supporting cards, recent activity and upcoming entries to Business's surface/spacing hierarchy while keeping Personal-only sections and behavior.

## Phase 3: Validation and convergence

- [x] T006 [US1] Run TypeScript, targeted ESLint, production build and `git diff --check`; record browser review availability and any outstanding risks.

## Validation notes

- TypeScript project build passed (`npx tsc -b --pretty false`).
- Targeted ESLint passed with no warnings on the touched UI files.
- Production build completed successfully. Vite reported existing `use client` bundling notices and the existing large-chunk advisory.
- `git diff --check` passed. No authenticated browser session was available for a live visual review.

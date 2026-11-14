# Tasks: Accounting navigation, loading and Journals

## Phase 1 — Setup and navigation

- [x] T001 Remove `SetupProgress` and the duplicate step list from Setup Overview.
- [x] T002 Rename the chart route to `chart-of-accounts` and redirect the old path.
- [x] T003 Update sidebar, breadcrumbs, guard, Overview links and AI targets.

## Phase 2 — Chart loading

- [x] T004 Add a `ready` gate around the first chart load.
- [x] T005 Reuse the accounting page skeleton while the chart/setup status is pending.
- [x] T006 Keep later chart refreshes mounted.

## Phase 3 — Active Overview

- [x] T007 Extract `AccountingMetricCard` with the main Overview two-layer style.
- [x] T008 Use the shared metric card in the active Overview.
- [x] T009 Normalize active Overview palette, typography and cards to slate.

## Phase 4 — Journals

- [x] T010 Require `status.operational` in the route guard and sidebar.
- [x] T011 Add a defensive blocked page state.
- [x] T012 Add entries, posted, reversed and lines metrics.
- [x] T013 Wrap filters/list in the refreshed page composition with a titled panel.
- [x] T014 Add lines column, retry alert and status display.
- [x] T015 Clean duplicated modal section classes and summary surface.

## Phase 5 — Verification

- [x] T016 Add en/pt/fr/de keys.
- [x] T017 Run `tsc -b`, lint, i18n check and build.
- [x] T018 Update convergence notes, evidence and tracker.

# Tasks: Accounting chart setup UX

## Phase 1 — Cleanup

- [x] T001 Delete `src/shared/ui/ProductTour` and every import/usage.
- [x] T002 Remove tour state, steps and compass action from `ChartOfAccountsPage`.
- [x] T003 Remove `guidedSetup.takeTour` from all accounting locales.
- [x] T004 Remove Review guide and AI setup items from `AccountingSidebar`.

## Phase 2 — AI setup

- [x] T005 Add neutral styling and `gap-2` to AI entry and wizard actions.
- [x] T006 Add per-question option overrides to `QuestionField`.
- [x] T007 Render the country question with `getCountries(i18n.language)`.
- [x] T008 Map the workspace country code to a localized label.
- [x] T009 Report answer progress from the wizard and confirm close in the provider.
- [x] T010 Implement Keep scratch / Discard answers and clear scratch on apply.

## Phase 3 — Chart setup

- [x] T011 Refactor method selection into a design-system card selector with icons.
- [x] T012 Add cancel support and a single active method panel.
- [x] T013 Add a rich manual example placeholder and copyable base structure.
- [x] T014 Add `manualImport.ts` validator with headers, rows, choices, duplicates and parents.
- [x] T015 Render the paste inspector with counts, errors and warnings.
- [x] T016 Block manual submission while validation errors exist.

## Phase 4 — Copy and verification

- [x] T017 Add en/pt/fr/de translation keys.
- [x] T018 Run `tsc -b`, lint, i18n check and build.
- [x] T019 Update convergence notes and evidence.

## Dependencies

- T006–T008 depend on the shared country helper only.
- T009–T010 depend on the provider/wizard state split.
- T013–T016 are ordered: parser first, UI second.

## Parallelisable

- T001–T004 and T011–T012 touch disjoint files.
- Translation updates (T017) can follow all copy changes.

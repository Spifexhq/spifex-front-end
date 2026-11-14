# Tasks: Page Skeleton Layout Parity

**Input**: Design documents from `specs/003-page-skeleton-layout-parity/`
**Prerequisites**: `spec.md`, `plan.md`, `research.md`

## Phase 1: Shared foundation

- [x] T001 Rewrite `src/shared/ui/Loaders/PageSkeleton.tsx` as content-only variants with `PageSkeletonShell` and `SettingsPageSkeleton`.
- [x] T002 Add layout fallback support in `src/shared/layout/SectionLayout/index.tsx`.
- [x] T003 Update `SettingsLayout` and `AccountingLayout` fallbacks; make `PersonalLayout` fallback content-only.

## Phase 2: Settings and account pages

- [x] T004 Update Business settings table pages (Category, Project, Member, Entity, Department, Bank, Inventory) to `SettingsPageSkeleton`/`settings-table`.
- [x] T005 Update Currency, Format and Workspace management skeletons to matching settings variants.
- [x] T006 Update Organization (form split) and Group (master/detail) skeletons.
- [x] T007 Update Personal profile, Security, Notification and Limits skeletons with the correct personal/business shell.
- [x] T008 Replace the Integrations list loading skeleton with a table-shaped skeleton.

## Phase 3: Product pages

- [x] T009 Add the dashboard skeleton for Personal Overview/Reports.
- [x] T010 Align Business Overview skeleton with the loaded metric/chart/activity composition.
- [x] T011 Add the onboarding skeleton inside the onboarding page frame.
- [x] T012 Add the import review skeleton.
- [x] T013 Update Accounting list pages, route guard, correlations and in-dialog detail skeletons.
- [x] T014 Add the billing skeleton.
- [x] T015 Update Personal locale setup and permission route skeletons.

## Phase 4: Verification and documentation

- [x] T016 Run `npm run lint`.
- [x] T017 Run `npm run build` (TypeScript + Vite).
- [x] T018 Inspect responsive behavior at 360px and 1440px for representative settings, dashboard, accounting and onboarding routes.
- [x] T019 Update the design-system documentation evidence and write `convergence.md`.

## Dependencies

- T001 blocks all call-site tasks.
- T002–T003 depend on T001 and unblock layout fallbacks.
- Phase 2 and Phase 3 page tasks can run in parallel by file group.
- Phase 4 depends on all implementation tasks.

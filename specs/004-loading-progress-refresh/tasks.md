# Tasks: Loading Progress Refresh

**Input**: Design documents from `specs/004-loading-progress-refresh/`
**Prerequisites**: `spec.md`, `plan.md`, `research.md`

## Phase 1: Shared primitives

- [x] T001 Add progress/shimmer keyframes and reduced-motion rules in `src/index.css`.
- [x] T002 Refactor `src/shared/ui/Loaders/TopProgress.tsx`: sticky top bar, gradient sweep, center capsule, localized progressbar label, remove `topOffset`.
- [x] T003 Upgrade `SkeletonLine` in `src/shared/ui/DataTable/DataTableSkeleton.tsx` to the gentle shimmer.

## Phase 2: Call sites

- [x] T004 Remove obsolete `topOffset={64}` from all `TopProgress` usages.
- [x] T005 Verify no fixed top-progress usage remains and no page wraps the sticky bar in an overflow-hidden parent.

## Phase 3: Design-system documentation

- [x] T006 Update `docs/design-system/08-interactions-and-motion.md` loading hierarchy and motion notes.
- [x] T007 Add evidence under `docs/design-system/evidence/phase8/`.

## Phase 4: Verification

- [x] T008 Run `npm run lint`.
- [x] T009 Run `npm run build`.
- [x] T010 Check top bar at 360/1440, scrolled state, dialog/popover stacking, and reduced motion.
- [x] T011 Write `convergence.md` and close task checkboxes.

## Dependencies

- T001–T003 block call-site verification.
- T004 can run after T002.
- T006–T007 can run in parallel with verification.
- T010 depends on T001–T005.

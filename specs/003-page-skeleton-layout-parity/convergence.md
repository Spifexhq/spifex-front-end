# Convergence: Page Skeleton Layout Parity

**Feature**: `003-page-skeleton-layout-parity`
**Date**: 2026-11-14
**Status**: Implemented — checks passing; visual evidence recorded.

## Requirement coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Content-only skeleton + explicit shells | Done | `PageSkeleton`, `PageSkeletonShell`, `SettingsPageSkeleton` in `src/shared/ui/Loaders/PageSkeleton.tsx`. |
| FR-002 Layout variants | Done | 15 named variants mapped in `research.md` and implemented in `PageSkeleton.tsx`. |
| FR-003 No duplicate page chrome | Done | `SectionLayout` fallback prop; `SettingsLayout`/`AccountingLayout` explicit fallbacks; skeleton no longer renders a title/action row. |
| FR-004 Design-system reuse | Done | Uses `PageSkeleton`/`DataTableSkeleton`/`SkeletonLine`, canonical page frame, settings surface classes, documented radii and spacing. |
| FR-005 Update page-level call sites | Done | All `PageSkeleton` page usages audited; Integrations list now uses `DataTableSkeleton`. |
| FR-006 Accessibility | Done | Localized `sr-only` label, `role="status"`, `aria-busy`, `aria-hidden` decorative content, `motion-safe:animate-pulse`. |
| FR-007 Responsive behavior | Done | 360/1440 preview checks; settings toolbar collapses to filter toggle + action, form/groups stack, dashboard has no overflow. |
| FR-008 No behavior/API/route/copy changes | Done | No route, permission, API, payload or translation files changed. |

## Success criteria

- **SC-001**: Pass — page/settings shells now match the actual containers.
- **SC-002**: Pass — audited page groups use composition-specific variants.
- **SC-003**: Pass — removed the fake title/action row; layout headings stay real.
- **SC-004**: Pass — `npm run lint` (0 errors) and `npm run build` pass; 360/1440 visual spot checks found no overflow.
- **SC-005**: Pass — variants and shells are named and documented in `06-component-standards.md`.

## Checks run

| Check | Result |
| --- | --- |
| `npm run lint` | Pass; 7 pre-existing warnings unrelated to this feature. |
| `npm run build` | Pass; TypeScript `tsc -b` and Vite production build completed. |
| Visual 360px | Settings table, form split and dashboard checked in a local preview harness. |
| Visual 1440px | Groups master/detail checked; 1440px iframe width confirmed the 300px + detail split. |
| Import audit | No remaining page-level generic `PageSkeleton` misuse found. |

## Deviations and risks

- The Suspense fallback for `PersonalLayout` and `AccountingLayout` is a generic
  content skeleton because the route chunk may resolve to any page. The page
  data-load skeleton still uses the specific variant.
- `DataTableSkeleton` columns are representative rather than derived from page
  column definitions. Update the variant when a table gains or loses a column.
- Visual checks used a temporary harness mounting the skeletons directly. The
  harness was removed; authenticated end-to-end route screenshots were not
  captured because they require a live workspace session.
- Lint warnings are pre-existing (`ProductBillingSettings`, `ProductChoice`,
  `PersonalAccessProvider`, `PersonalPermissionRoute`, `SettingsSurface`) and were
  not introduced by this change.

## Follow-ups

- If new page compositions appear, add a named variant rather than local skeleton
  markup.
- Keep layout-owned headings in the layout; do not reintroduce a skeleton title.

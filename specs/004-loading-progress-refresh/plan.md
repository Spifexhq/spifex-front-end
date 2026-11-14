# Implementation Plan: Loading Progress Refresh

**Branch**: `004-loading-progress-refresh` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary

Move the top progress indicator into the content scroll flow with sticky positioning and a negative height offset, lower its stacking order below floating layers, and replace the hard sliding block with a soft gradient sweep. Refine the blocking center state into a compact capsule and align skeleton lines with the same gentle shimmer language.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18
**Primary Dependencies**: Tailwind CSS 4, react-i18next, Vite 6
**Storage**: N/A
**Testing**: `npm run lint`, `npm run build`, reduced-motion and responsive visual checks
**Target Platform**: Web desktop and mobile
**Project Type**: Single-page web application
**Constraints**: No route/API/permission/copy changes; reuse design tokens; no new accent hues
**Scale/Scope**: Shared `TopProgress`, `SkeletonLine`, global keyframes, and all `TopProgress` call sites

## Constitution Check

- **Product boundaries**: PASS — shared loading primitive only.
- **Stable API and routes**: PASS — no route or API changes.
- **Workspace context**: PASS — no data identity or request behavior changes.
- **Existing design system**: PASS — reuses accent tokens, motion durations and canonical primitives.
- **Feature boundaries verification**: PASS — lint, build and responsive/reduced-motion checks planned.

## Project Structure

```text
specs/004-loading-progress-refresh/
├── spec.md
├── plan.md
├── research.md
├── tasks.md
└── convergence.md

src/shared/ui/Loaders/TopProgress.tsx         # sticky top bar + center capsule
src/shared/ui/DataTable/DataTableSkeleton.tsx # SkeletonLine shimmer
src/index.css                                 # progress and shimmer keyframes
src/**/*.tsx                                  # remove obsolete topOffset prop
docs/design-system/08-interactions-and-motion.md
docs/design-system/evidence/phase8/
```

**Structure Decision**: Keep one canonical loading primitive and update its call sites. No new loader components or duplicate animation recipes.

## Design decisions

1. **Sticky, not fixed.** The top bar is a child of the page content, so it inherits the content column width and cannot cross the sidebar.
2. **Zero layout shift.** The bar's height is offset with a matching negative bottom margin; it paints over content only while active.
3. **Stacking.** Use content-level z-index (`z-20`), below navbar (`z-30`), sidebar (`z-40`), popovers/modals and toasts.
4. **Motion.** A single 1.4s accent gradient sweep on a neutral track. Reduced motion shows a static accent segment.
5. **Center state.** A minimal centered line with a localized accessible label and no visible words, borders or shadows.
6. **Skeletons.** Reuse the existing `shimmer` keyframe for `SkeletonLine`; no opacity pulse.

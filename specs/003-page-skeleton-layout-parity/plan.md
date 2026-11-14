# Implementation Plan: Page Skeleton Layout Parity

**Branch**: `003-page-skeleton-layout-parity` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-page-skeleton-layout-parity/spec.md`

## Summary

Refactor the shared page-level loading primitives so skeletons are content-only layout mirrors, then add explicit shells for page and settings frames. Replace the generic `PageSkeleton` usages with variants that match each page composition, and stop the double gutter/duplicate title that appears when a skeleton already renders inside a padded layout.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18
**Primary Dependencies**: React Router 7, Tailwind CSS 4, react-i18next, Vite 6
**Storage**: N/A
**Testing**: `npm run build` (tsc + Vite), `npm run lint`, targeted source inspection and responsive visual checks
**Target Platform**: Web (desktop and mobile browsers)
**Project Type**: Single-page web application
**Performance Goals**: Skeleton renders immediately on first load and does not delay requests
**Constraints**: No route/API/permission/copy changes; use existing design tokens and primitives; preserve reduced-motion behavior
**Scale/Scope**: Shared skeleton primitive plus page-level call sites in Business, Personal, Accounting, Workspaces and account settings

## Constitution Check

*GATE: Must pass before implementation. Re-check after implementation.*

- **Product boundaries**: PASS — shared primitive only; Personal and Business call sites keep their own variants.
- **Stable API and routes**: PASS — no route, API or payload changes.
- **Workspace context**: PASS — no data fetching or identity handling changes.
- **Existing design system**: PASS — reuses `PageSkeleton`, `DataTableSkeleton`, `SkeletonLine`, canonical containers and spacing.
- **Feature boundaries verification**: PASS — build, lint and responsive checks planned.

## Project Structure

### Documentation (this feature)

```text
specs/003-page-skeleton-layout-parity/
├── spec.md
├── plan.md
├── research.md
├── tasks.md
└── convergence.md
```

### Source Code (repository root)

```text
src/shared/ui/Loaders/PageSkeleton.tsx          # content-only variants + page/settings shells
src/shared/layout/SectionLayout/index.tsx       # configurable Suspense fallback
src/products/business/layouts/SettingsLayout    # settings fallback
src/products/business/layouts/AccountingLayout  # page fallback
src/products/personal/layouts/PersonalLayout    # content-only fallback inside padded main
src/products/business/pages/**                  # accounting, overview, onboarding, settings call sites
src/products/personal/**                        # dashboard and permission route call sites
src/features/account-settings/pages/**          # profile/security/notification/format/currency/integrations
src/features/workspaces/**                      # workspace management and billing
src/app/authentication/PersonalLocaleSetup      # locale setup fields skeleton
src/products/business/pages/Finance/BankImports # import review skeleton
```

**Structure Decision**: Keep one canonical shared skeleton module and update page call sites to use it. Page-specific compositions are represented as named variants rather than duplicated local markup.

## Phase 0: Research

See [research.md](./research.md). Decisions:

1. `PageSkeleton` becomes content-only; shells own the page frame.
2. Variants map to observed page compositions, not one generic grid.
3. Layout-owned headings stay real; skeletons never invent page chrome.
4. Table-only regions reuse `DataTableSkeleton`; page-level waits use `PageSkeleton`.

## Phase 1: Design

- `PageSkeleton` variants: `table`, `settings-table`, `form`, `sections`, `panel`, `settings-form`, `groups`, `settings-list`, `dashboard`, `billing`, `onboarding`, `review`, `accounting`, `correlations`, `fields`.
- Shells: `PageSkeletonShell` (canonical page container), `SettingsPageSkeleton` (settings surface frame).
- Accessibility contract: one localized busy status per skeleton region; decorative shapes `aria-hidden`; motion-safe pulse.
- Responsive contract: single column below the documented breakpoints, canonical 1440px max width, no horizontal overflow.

## Phase 2: Tasks

See [tasks.md](./tasks.md).

## Complexity Tracking

No constitution violations.

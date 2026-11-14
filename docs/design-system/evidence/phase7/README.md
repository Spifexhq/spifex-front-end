# Phase 7 — Page skeleton layout parity

**Date**: 2026-11-14
**Feature**: `specs/003-page-skeleton-layout-parity`

## Scope

First-load page skeletons were revised to mirror the loaded page frame and
section composition. The previous `PageSkeleton` added its own page gutter and a
fake title/action row, which produced double padding inside `PersonalLayout` and
`AccountingWorkspace` and a duplicate heading under `SettingsLayout`.

## Changes

- `PageSkeleton` is now content-only and exposes layout variants: `table`,
  `limits`, `settings-table`, `form`, `sections`, `panel`, `settings-form`, `groups`,
  `settings-list`, `dashboard`, `billing`, `onboarding`, `review`, `accounting`,
  `correlations`, `fields`.
- `PageSkeletonShell` owns the canonical page frame
  (`max-w-[1440px]`, `px-4 py-6 sm:px-7`).
- `SettingsPageSkeleton` owns the settings frame
  (`.settings-page` + `.settings-content`) so the real `SettingsLayout` heading
  remains above the skeleton.
- `SectionLayout`, `SettingsLayout` and `AccountingLayout` now supply explicit
  Suspense fallbacks; `PersonalLayout` keeps its content-only fallback inside
  its existing padded main.
- Business settings tables, profile/section pages, Group master/detail,
  Workspace management, Billing, Limits, Personal dashboard, Business overview,
  Onboarding, bank-import review, accounting list/correlation pages, locale
  setup and the Personal permission route now use matching variants.

## Evidence

| File | Check |
| --- | --- |
| `settings-table-360.jpg` | Settings table skeleton at 360px: one mobile filter toggle, primary action, table; no horizontal overflow. |
| `groups-1440.jpg` | Master/detail skeleton at 1440px: 300px list rail + detail panel. |
| `dashboard-360.jpg` | Personal dashboard skeleton at 360px: stacked filter fields, two-column metric cards, full-width chart. |

The screenshots were taken from a temporary local preview harness that mounted
the skeletons directly. The harness files were removed after verification.

## Commands

```text
npm run lint      # 0 errors; 7 pre-existing warnings
npm run build     # tsc -b + vite build passed
```

## Notes

- Skeletons stay decorative (`aria-hidden`) inside one localized
  `role="status"` / `aria-busy="true"` region.
- Skeleton columns are representative, not data-driven. When a page changes its
  section order, update the matching variant.

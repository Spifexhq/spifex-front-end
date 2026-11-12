# Phase 4 evidence

Covers PR 12 (`DS-048`, selection bar/confirmation policy) and PR 13 (`DS-022`,
`DS-023`, filter cards and page stacks).

## PR 12 — Selection bar and confirmation policy

### Shared component

`src/shared/ui/SelectionBar/SelectionBar.tsx` owns:

- Portal into `FeedbackStackProvider` (or fixed fallback).
- Bottom-center position, `z-[15000]`, 12px stack gap, `rounded-xl` surface,
  shared enter/exit animation.
- `role="region"` by default; `role="alertdialog"` for bulk confirmation.
- `label`, `className` width cap, optional `layout`, `onKeyDown`.

Migrated:

- `DataTable` selection/bulk-confirm bar (`max-w-[320px]`).
- Finance `SelectionToolbar` (`max-w-3xl`).
- Personal selection actions (`max-w-3xl`).

### Confirmation policy

| Scenario | Pattern |
| --- | --- |
| Record action (row/record delete, import) | `ConfirmToast` |
| Bulk destructive action on a selection | `SelectionBar role="alertdialog"` |
| Unsaved changes inside a dialog | In-dialog confirmation overlay |
| New pattern | Not allowed; use one of the above |

## PR 13 — Filter/toolbar and page-stack normalization

### Filter cards

| Surface | Before | After |
| --- | --- | --- |
| Business Overview filter panel | Hand-rolled `rounded-xl border-slate-200 p-4` form | `Card as="form" tone="slate" radius="xl" padding="compact"` |
| Personal collection search | Hand-rolled `rounded-xl border-gray-200 p-3 sm:p-4` form | `Card as="form" radius="xl" padding="none"` + `p-3 sm:p-4` |

The shared `OverviewFilterPanel` stays the canonical business/personal filter
composition: optional toolbar row (`flex flex-wrap items-center justify-between
gap-3`) followed by the card.

### Page stacks

| Page root | Before | After |
| --- | --- | --- |
| Accounting shell + overview/setup/reconciliation/chart import | `space-y-6` | `space-y-5` |
| Finance / Bank Imports | `space-y-6` | `space-y-5` |
| Business Overview | `space-y-6` | `space-y-5` |
| Personal Dashboard | `space-y-6` | `space-y-5` |
| Accounting Correlations | `space-y-6` | `space-y-5` |

Reporting (`Reporting/Reports`) keeps `md:space-y-6` as an intentional
density exception; settings pages were already `space-y-5`.

### Padding rule (documented in `05-spacing-and-layout.md`)

- `compact` (`p-4`): filters and toolbars.
- `default` (`p-5`): metrics and content cards.
- `spacious` (`p-6`): hero/reporting summaries only.

Do not mix paddings across equivalent cards in the same viewport.

## Verification

- `npm run build` — pass.
- `npx --no-install eslint src` — 0 errors, 7 pre-existing warnings.
- `npm run lint` — unchanged; 24 pre-existing `.preview/*` errors.
- `npx --no-install tsc -b` — pass after both PRs.
- Type check confirms the three selection bars share one positioning/animation
  contract; no `space-y-6` page root remains outside the reporting exception.

Runtime screenshots for authenticated Finance/Accounting filter surfaces remain
pending; those routes need backend/auth data, so the checks above are
compile-time plus source inspection.

## PR 14 — `Card` on summary surfaces

Migrated the remaining metric/summary shells to `Card` (class-equivalent, no
visual redesign):

| Surface | Card usage |
| --- | --- |
| `ActivityCalendar` | `as="section" radius="xl" tone="slate" padding="default"` |
| `AccountBalancePanel` | `as="section" radius="xl" padding="none"` + `overflow-hidden` |
| Accounting overview progress card | `as="div" padding="default"` + `space-y-5` |
| Accounting overview optional cards | `as="article" padding="default"` |
| Accounting overview “how it works” card | `as="div" padding="default"` |
| Accounting setup review card | `as="div" padding="default"` + `shadow-xs` |
| Accounting profile configuration | `as="div" padding="default"` + `shadow-xs` |
| Journal totals panel | `as="section" padding="default"` (also removed duplicated classes) |
| Chart-import mode panels | `as="div" padding={embedded ? "default" : "compact"}` |
| Statement upload panel | `as="section" radius="xl" tone="slate" padding="default"` + `sm:p-7` |

Intentionally left local:

- `OverviewMetricCards` keeps its two-layer metric treatment (tinted outer
  frame, inner white card, delta footer) because `Card` has no equivalent
  tone/padding combination.
- Reporting and correlation views keep their local reporting radius/density
  rules (`DS-024`), and accent/help panels keep tone-specific backgrounds.
- `OverviewSkeleton` mirrors the metric card structure rather than importing
  `Card`.

Verification: `npx --no-install tsc -b` and `npm run build` pass; no behavior,
copy, routing or API changes.

## PR 15 — Empty/error states and loading choice

### New primitives

`src/shared/ui/State`

- `EmptyState`: `title`, optional `description`, `icon`, `action`; size `xs`
  (py-4, inside compact cards), `sm` (py-8), `md` (py-12, default). Centered
  title 13px medium gray-700, description 12px gray-400.
- `ErrorState`: `message`, optional `title`/`action`; `tone="danger"|"warning"`,
  `variant="panel"|"inline"`, `size="sm"|"md"`. `role="alert"`.

### Migrated

- `DataTable` empty row (`EmptyState`) and error row (`ErrorState inline`).
- `AccountBalancePanel` error.
- `FinancialCharts` no-activity overlay.
- Navbar notifications empty.
- Workspace management empty list.
- Personal dashboard budgets/goals and upcoming empty lists.
- Business overview attention/accounts empty lists.
- Workspace switcher, saved-view/config modal warnings, accounting periods
  warning, personal record dialog error.

### Loading audit

All first-load regions use `PageSkeleton`, `DataTableSkeleton`, or
`DialogSkeleton`; no app page renders `Spinner`/`PageLoader` for first load.
`OverviewSkeleton` mirrors the dashboard layout. Keep the skeleton-first rule.

Intentionally local: Reporting's richer empty illustration keeps its reporting
typography; neutral setup/blocked panels keep their informational slate/dashed
treatment rather than danger styling.

Verification: `npx --no-install tsc -b` and `npm run build` pass; no behavior,
copy, routing or API changes.

## PR 16 — Badge primitive

A third duplicate clearly existed, so `Badge` was promoted.

`src/shared/ui/Badge`

- Tones: `neutral`, `success`, `warning`, `danger`, `info`, `lime`, `orange`.
- Variants: `soft` (default), `outline`.
- Sizes: `sm` 10px, `md` 11px; `px-2 py-0.5`, `rounded-full`.
- `dot` for a leading status dot; text always carries the meaning.

Migrated:

| Surface | Usage |
| --- | --- |
| Workspace management “current” | `tone="success"` |
| Plan billing “current” | `tone="success"` |
| Onboarding done/required | `success`/`warning`, `variant="outline"`, `size="md"` |
| Reporting range/split change | `tone={isUp ? "success" : "danger"}`, `dot` |
| Reporting overdue pay/receive/other | `danger`/`info`/`neutral` |
| Accounting correlation group label | `neutral`, `outline`, `uppercase` |
| Settings background-sync (5 pages) | `neutral`, `outline`, `size="md"` |
| Limits-and-usage `ToneBadge` | maps to `success`/`lime`/`warning`/`orange`/`danger`/`neutral` |

Not migrated: input/filter chips (`Chip`, `SettingsFilter`, `Input labelChip`)
intentionally use `rounded-md` and remain input affordances, not status badges.

Verification: `npx --no-install tsc -b` and `npm run build` pass; the repeated
status-pill class recipe is gone outside the primitive.

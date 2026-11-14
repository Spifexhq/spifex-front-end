# Implementation Plan: Accounting Overview refactor

**Branch**: `007-accounting-overview-refactor` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Remove the duplicate Add account action from the chart page and replace the Accounting Overview with two deliberate compositions: a setup dashboard driven by `AccountingSetupStatus`, and an operational dashboard driven by trial balance and journal data.

## Technical Context

- React + TypeScript + Vite.
- Shared UI: `Card`, `Button`, `PageSkeleton`, `SkeletonLine`.
- Setup data: `useAccountingSetup()` (`AccountingSetupStatus`).
- Operational data: `api.getTrialBalance()` and `api.getJournalEntries()`.
- Review guide: `useAccountingReviewGuide().openGuide`.
- No backend contract changes.

## Constitution Check

- Preserve routes, permissions and existing API payloads.
- Reuse design-system surfaces and type scale.
- Keep all copy in en, pt, fr and de.
- Keep the page responsive and accessible.
- Frontend-only feature; artifacts stay in the frontend repository.

## Design Decisions

1. **Chart actions** — the empty onboarding card owns Add account; the populated chart gets a top toolbar with Add account and More actions. The bottom action row is deleted.
2. **Setup composition** — status pill, next-action hero with progress bar, `SetupProgress`, issue list and four configuration cards (chart, books, category rules, bank connections).
3. **Operational composition** — status pill, attention/error panels, four metric cards, trial-balance table with totals, recent journals and a quick-action card.
4. **Issue linking** — flatten available step issues and map each step to its route; Review guide stays an in-page action.
5. **Data loading** — keep trial balance and journals in one request pair; retry resets the skeleton state.
6. **Typography/colour** — page titles `text-2xl`, section headings `text-sm`, compact labels `text-[11px]`, monetary values `tabular-nums`.

## Validation

- `npx tsc -b`
- `npm run lint`
- `npm run check:accounting-i18n`
- `npm run build`
- Responsive review of the setup and operational states.

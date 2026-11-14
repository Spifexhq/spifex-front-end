# Phase 12 — Accounting Overview refactor

**Date**: 2026-11-14
**Feature**: `spifex-front-end/specs/007-accounting-overview-refactor`

## Scope

- Removed the duplicate bottom Add account action from Chart of accounts.
- Empty charts use the onboarding card; populated charts use a top toolbar with
  Add account and More actions.
- Rebuilt the pre-activation setup Overview around a next-action hero, progress,
  step state, validation issues and configuration cards.
- Rebuilt the post-activation operational Overview around metrics, a
  trial-balance table with totals, recent journals, attention/error states and
  quick actions.

## UX rules

- One Add account entry point per chart state.
- The setup next action follows workspace settings → chart → books → activation.
- AI setup is a neutral secondary action while the chart is incomplete.
- Issue rows link directly to the affected Accounting page.
- Operational metrics use `Card tone="metric"`; money uses `tabular-nums`.
- Trial-balance totals always reflect the full response even when the preview
  shows the first eight accounts.
- A failed trial/journal request shows an alert and retry instead of partial
  figures.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| `check:accounting-i18n` | 472 keys verified |

## Notes

Authenticated browser verification was unavailable without a signed-in
workspace. Both state branches were reviewed statically and through the
production build. The broader backend suite remains blocked by the existing
`banking.0014_import_categories` test-database migration error.

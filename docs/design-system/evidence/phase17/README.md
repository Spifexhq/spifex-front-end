# Phase 17 — Accounting page actions

**Date**: 2026-11-14
**Feature**: `spifex-front-end/specs/012-accounting-page-actions`

## Scope

- Added `+` icons to accounting page create actions.
- Moved create actions into the filter toolbar row:
  - Books
  - Bank connections
  - Category rules
  - Periods
  - Journals
- Removed page-level description paragraphs from all accounting pages.
- Aligned Chart Add/More with the view tabs row.
- Moved Books, Category rules and Bank connections into the tabs row as
  icon-only actions.
- Made Add account the standard orange primary button.
- Refactored Chart filters to the Settings chip/popover pattern.
- Added `+` to the manual-journal Add line action.

## UX rules

- Accounting page title comes from the shell; no repeated page description.
- Create actions use `Plus` and share the filter row.
- Chart actions share the tabs row; empty chart keeps Add in the onboarding card.
- Contextual guidance inside cards and side panels remains.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| `check:accounting-i18n` | 474 keys verified |

## Notes

The key count dropped because page-description strings are no longer referenced.

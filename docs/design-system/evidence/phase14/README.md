# Phase 14 — Accounting journals and filters

**Date**: 2026-11-14
**Feature**: `spifex-front-end/specs/009-accounting-journals-and-filters`

## Scope

- Fixed recent journals in Accounting Overview by setting newest-first cursor
  ordering on the journal list viewset and reading the paginated response.
- Decoupled trial balance and journal loads so one failure does not hide the
  other.
- Added compact journal display IDs (`JE-YYYYMMDD-XXXXXXXX`, e.g.
  `JE-20261108-FF9A1234`) across Journals,
  Overview and entry previews.
- Rebuilt the shared Accounting filter bar on the Settings pattern with
  `SettingsSurface`, filter chips, Settings popovers, search and clear-all.
  Search is a `Search` chip in the same filter-item row as the other chips, and
  filter popovers across Accounting, Business Settings and Personal collections
  no longer repeat the control label below their title.
  Applied to Journals, Books, Bank connections, Posting policies and Periods.

## UX rules

- Journal list pages are newest-first.
- The entry column shows a readable journal ID, never the full external ULID.
- Filter chips show applied values and provide a direct clear action.
- Each filter opens a Settings-style popover with apply/clear.
- Mobile filter chips collapse under the Settings Filters toggle.
- Search is part of the filter-item row and applies on submit.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| `check:accounting-i18n` | 479 keys verified |
| Backend `manage.py check` | Pass |
| Backend migration check | No changes |
| Backend AI-guide tests | 6 passed |
| Cursor ordering | `('-posting_date', '-id')` |

## Notes

Authenticated browser verification was unavailable without a signed-in
workspace. The broader backend suite remains blocked by the existing
`banking.0014_import_categories` test-database migration error.

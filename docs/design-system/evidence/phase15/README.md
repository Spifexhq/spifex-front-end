# Phase 15 — Filter popover standardization

**Date**: 2026-11-14
**Feature**: `spifex-front-end/specs/010-filter-popover-standardization`

## Scope

- Standardized Settings-style filter popovers across Accounting, Business
  Settings and Personal.
- Removed extra first-child top spacing.
- Desktop focus now targets editable text/date fields; select-only popovers keep
  panel focus; mobile never focuses a field.
- Unified placeholder colour/size across inputs, dates, textareas and selects.
- Removed duplicated visible field labels inside popovers.
- Accounting search moved into a `Search` filter chip in the filter-items row.
- Updated design-system component and interaction specifications.

## Behaviour

- Filter popover body: standard `p-3`, first control flush with the title.
- Select placeholders expose `data-select-placeholder`; select triggers expose
  `data-select-trigger`.
- Placeholder token: `#94a3b8`, 13px.
- Popover title is the only visible field label.
- Search chip opens a Settings popover with the search input.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| `check:accounting-i18n` | 479 keys verified |

## Notes

Authenticated visual verification was unavailable without a signed-in workspace.
The broader backend suite remains blocked by the existing
`banking.0014_import_categories` test-database migration error.

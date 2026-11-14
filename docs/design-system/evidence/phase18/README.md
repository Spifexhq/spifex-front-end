# Phase 18 — Trial balance and journal labels

**Date**: 2026-11-14
**Feature**: `spifex-front-end/specs/013-trial-balance-journal-labels`

## Scope

- Refactored the Accounting Overview trial-balance panel.
  - Bordered table with header surface and row hover.
  - Account-code badges.
  - Corrected four-column totals.
  - Balanced/Out of balance badge and difference colour.
- Renamed Journals metric cards:
  - journal count → **Journals**
  - line count → **Entries**

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| `check:accounting-i18n` | 476 keys verified |

## Notes

The old total row spanned five effective cells across four columns; the new row
aligns Debit, Credit and Balance correctly.

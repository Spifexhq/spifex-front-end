# Convergence: Trial balance and journal metric labels

**Feature**: `013-trial-balance-journal-labels`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Trial-balance refactor | Done | Bordered table, header surface, account badges and row hover. |
| FR-002 Aligned totals | Done | Total row now has four cells matching the four columns. |
| FR-003 Balance badge | Done | Balanced/Out of balance badge plus emerald/rose difference. |
| FR-004 Lines → Entries | Done | Journals metric wording updated in four languages. |
| FR-005 Journals count label | Done | Journal-count card reads Journals to avoid duplicate Entries. |
| FR-006 Localisation | Done | en/pt/fr/de updated. |
| FR-007 No API/permission changes | Done | UI-only change. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |
| `npm run check:accounting-i18n` | 476 keys |

## Notes

- The previous total row used five effective cells for four columns; the new
  layout aligns Debit, Credit and Balance correctly.
- “Entries” describes journal lines; “Journals” describes the journal count.

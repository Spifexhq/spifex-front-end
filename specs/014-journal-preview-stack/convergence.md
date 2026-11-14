# Convergence: Journal preview stack

**Feature**: `014-journal-preview-stack`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Static lines table | Done | `table-fixed` table, no internal overflow-y. |
| FR-002 SidePanel stackDepth | Done | Drawer narrows and renders page edges behind. |
| FR-003 Journals preview stack | Done | `PreviewTarget[]` state in the Journals page. |
| FR-004 Related IDs | Done | Settlement/entry source renders a preview action. |
| FR-005 Related data preview | Done | `api.getEntry` / `api.getSettledEntriesBulk` and compact details. |
| FR-006 Stack close/replace | Done | Close pops; unrelated journal replaces the stack. |
| FR-007 Edit unstacked | Done | Edit drawers use default depth 0. |
| FR-008 Localisation | Done | en/pt/fr/de keys added. |
| FR-009 Design-system docs | Done | Preview-stack subsection added. |
| FR-010 Settlement bulk payload | Done | `getSettledEntriesBulk` sends `ids` as an array. |
| FR-011 Stack motion | Done | 220ms width transition; full-height square page edges push left on open and slide right on close; 180ms content fade. |
| FR-012 No other API/permission changes | Done | Existing reads reused. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |
| `npm run check:accounting-i18n` | 485 keys |

## Notes

- The previous preview table nested a `max-h-[65dvh] overflow-auto` DataTable
  inside the drawer scroll; the new table is static and the drawer owns scrolling.
- Related previews are limited to journal sources (`cash_entry` and
  `cash_settlement`); transfers and manual journals have no related preview.
- The settlement bulk endpoint requires a JSON list for `ids`; the client now
  sends an array.

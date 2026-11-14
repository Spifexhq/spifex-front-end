# Phase 19 — Journal preview stack

**Date**: 2026-11-14
**Feature**: `spifex-front-end/specs/014-journal-preview-stack`

## Scope

- Journal preview lines now use a static fitting table with no internal
  vertical overflow.
- Added stacked previews to `SidePanel` through `stackDepth`.
  - Drawer narrows by 14px per level.
  - Decorative page edges appear behind the top preview.
  - Only previews use stacking; edit drawers remain depth 0.
- Journals page keeps a preview stack:
  - initial journal preview;
  - related settlement/entry preview;
  - close pops to the previous preview;
  - unrelated journals replace the stack.
- Related settlement/entry IDs are clickable on journal details.
- Settlement previews now use the GET bulk endpoint, keeping the read path
  allowed in legacy read-only workspaces.
- Added stack motion: drawer width transition, full-height square page edges
  pushing left on open and sliding right on close, and content fade; removed the
  “Related preview” eyebrow.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| `check:accounting-i18n` | 485 keys verified |

## Notes

- The table is `table-fixed`; long account names truncate instead of creating
  horizontal overflow.
- Transfers and manual journals have no related preview source.

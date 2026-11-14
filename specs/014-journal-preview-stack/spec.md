# Feature Specification: Journal preview stack

**Feature Branch**: `014-journal-preview-stack`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Make the journal preview table fit without vertical overflow and allow related settlement/entry previews to stack behind the journal preview.

## User Scenarios & Testing

### User Story 1 - Fitting journal preview (Priority: P1)

As an accounting user, the ledger lines in a journal preview fit without an inner vertical scrollbar.

**Independent Test**: Open a journal with several lines in a 640px drawer and on a mobile viewport; confirm there is no scrollbar inside the table.

**Acceptance Scenarios**:

1. Given a journal preview, then the lines render in a fixed, full-width table.
2. Given long account names, then text truncates instead of creating horizontal overflow.
3. Given many lines, then the drawer body scrolls, not the table.
4. Given debit/credit totals, then they align under their columns.

### User Story 2 - Related previews stack (Priority: P1)

As an accounting user, I can open a settlement or entry linked from a journal preview without closing the journal.

**Independent Test**: Open a journal, click its related settlement ID, then close the settlement and confirm the journal is still there.

**Acceptance Scenarios**:

1. Given a journal with a settlement source, then the related settlement ID is a preview action.
2. Given a journal with an entry source, then the related entry ID is a preview action.
3. Given the related preview opens, then the journal preview remains in the stack and a page edge is visible.
4. Given the related preview is closed, then the journal preview is restored.
5. Given an unrelated journal is opened, then the stack is replaced, not extended.
6. Given an edit panel, then it does not use preview stacking.

## Requirements

- **FR-001**: Replace the journal-lines DataTable with a static, non-scrolling table.
- **FR-002**: Add `stackDepth` to `SidePanel`/`DialogShell` with page-edge visuals and drawer narrowing.
- **FR-003**: Keep a preview stack in the Journals page.
- **FR-004**: Show related settlement/entry IDs as preview actions on journal details.
- **FR-005**: Fetch related settlement/entry data and render a compact preview.
- **FR-006**: Closing a stacked preview pops one level; unrelated records replace the stack.
- **FR-007**: Edit drawers remain unstacked.
- **FR-008**: Add en/pt/fr/de copy.
- **FR-009**: Document the pattern in the design system.
- **FR-010**: Settlement previews must send `ids` as a list, not a comma-separated string.
- **FR-011**: Stacked previews use a width transition and full-height square page edges that push left on open and slide right on close; a short content fade is allowed; no visible “Related preview” label.
- **FR-012**: No other API or permission changes.

## Success Criteria

- **SC-001**: No vertical overflow inside the journal-lines table.
- **SC-002**: Related settlement/entry previews open without closing the journal.
- **SC-003**: The stack shows a visible page edge.
- **SC-004**: Closing the top preview restores the previous one.
- **SC-005**: `tsc -b`, lint, build and accounting i18n pass.

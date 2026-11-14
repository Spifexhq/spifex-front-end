# Feature Specification: Trial balance and journal metric labels

**Feature Branch**: `013-trial-balance-journal-labels`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Refactor the Accounting Overview trial balance, and rename the Journals “Lines” card to “Entries”.

## User Scenarios & Testing

### User Story 1 - Readable trial balance (Priority: P1)

As an accounting user, the trial balance reads like a proper ledger summary with aligned totals and a clear balance state.

**Independent Test**: Open `/accounting/overview` with balanced and unbalanced data, and with no balances.

**Acceptance Scenarios**:

1. Given accounts, then the table has a bordered surface, header row and account-code badges.
2. Given a total row, then Debit, Credit and Balance values align under their columns.
3. Given balanced data, then a Balanced badge is shown and the difference is neutral/positive.
4. Given unbalanced data, then the badge reads Out of balance and the difference is red.
5. Given no balances, then the empty state is shown without a balance badge.
6. Given loading, then the skeleton matches the panel.

### User Story 2 - Clear journal metrics (Priority: P2)

As an accounting user, the Journals metrics use distinct labels instead of two “Entries” cards or a misleading “Lines” card.

**Independent Test**: Open `/accounting/journals` and inspect the four metric cards.

**Acceptance Scenarios**:

1. Given the journal count, then the card reads **Journals**.
2. Given the journal-line count, then the card reads **Entries**.
3. Posted and Reversed remain unchanged.

## Requirements

- **FR-001**: Refactor the trial-balance panel layout and table styling.
- **FR-002**: Correct the total row so each value aligns under its column.
- **FR-003**: Add a balanced/out-of-balance badge and colour the difference.
- **FR-004**: Rename the Journals “Lines” card to “Entries”.
- **FR-005**: Rename the journal-count card to “Journals” to avoid duplicate “Entries”.
- **FR-006**: Add en/pt/fr/de copy.
- **FR-007**: No API or permission changes.

## Success Criteria

- **SC-001**: Trial-balance totals align correctly.
- **SC-002**: Balance state is visible at a glance.
- **SC-003**: Journals metric labels are distinct and localised.
- **SC-004**: `tsc -b`, lint, build and accounting i18n pass.

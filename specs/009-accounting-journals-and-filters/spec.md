# Feature Specification: Accounting journals and filters

**Feature Branch**: `009-accounting-journals-and-filters`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Recent journals are missing from Accounting Overview, the Journals entry ID is unfriendly, and Accounting filters should follow the Settings design language.

## User Scenarios & Testing

### User Story 1 - Recent journals appear (Priority: P1)

As an accounting user, the journal I posted most recently appears in Accounting Overview regardless of how many older journals exist.

**Independent Test**: Post a journal dated 2026-11-08 in a workspace with more than one page of journals, open Overview, and confirm it is the first recent entry.

**Acceptance Scenarios**:

1. Given more than 20 journals, then the recent list still starts with the newest posting date.
2. Given the trial balance fails, then journals still load independently.
3. Given journals fail, then the trial balance still loads independently.
4. Given either request fails, then an error alert with retry is shown.

### User Story 2 - Readable journal ID (Priority: P1)

As an accounting user, I see a compact journal ID instead of a long external identifier.

**Independent Test**: Open Journals and Overview and compare the displayed journal labels.

**Acceptance Scenarios**:

1. Given a stored `entry_number`, then it is shown unchanged.
2. Given an empty `entry_number`, then a stable `JE-YYYYMMDD-XXXX` label is shown.
3. Given the journal detail panel, then the same readable ID is used in the header.
4. Given a linked journal in an entry preview, then the readable ID is used.
5. The external ID is not displayed in the Journals entry column.

### User Story 3 - Settings-style filters (Priority: P1)

As an accounting user, filters on Accounting list pages look and behave like Settings filters.

**Independent Test**: Open Journals, Books, Bank connections and Periods; expand each filter, apply and clear it, and compare with Settings.

**Acceptance Scenarios**:

1. Given a filter bar, then it shows a search field and chip-style filter triggers.
2. Given an applied filter, then its value appears on the chip and a clear action is available.
3. Given a filter chip, then it opens a Settings-style popover with the control and Apply/Clear actions.
4. Given mobile width, then the filter chips collapse under the Settings-style Filters toggle.
5. Given clear all, then search, drafts and applied filters reset and the list reloads.

## Requirements

- **FR-001**: Set explicit newest-first ordering on the journal list viewset so cursor pagination does not fall back to primary-key order.
- **FR-002**: Load trial balance and journals independently; do not discard one when the other fails.
- **FR-003**: Add a shared journal display-ID helper: stored number, otherwise `JE-YYYYMMDD-XXXX` from the posting date and journal identifier suffix.
- **FR-004**: Use the display ID in Journals, Overview recent journals and entry previews.
- **FR-005**: Replace the Accounting record filter bar with Settings-style search, filter chips and popovers.
- **FR-006**: Keep remote filter options, date controls, apply/clear behaviour and pagination intact.
- **FR-007**: Apply the filter design to every Accounting page using `useRecordFilters`.
- **FR-008**: No permission or payload changes.

## Success Criteria

- **SC-001**: The most recent journal is visible on the first Overview load.
- **SC-002**: No full external journal ID appears in the Journals entry column.
- **SC-003**: Accounting filters match the Settings interaction pattern at desktop and mobile widths.
- **SC-004**: `tsc -b`, lint, build, backend check and accounting i18n pass.

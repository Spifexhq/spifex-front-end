# Feature Specification: Accounting page actions

**Feature Branch**: `012-accounting-page-actions`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Add `+` to accounting add buttons, move them into the filters row, remove page descriptions from accounting pages, and align chart add/more actions with the chart tabs.

## User Scenarios & Testing

### User Story 1 - Consistent add actions (Priority: P1)

As an accounting user, every page-level create action is marked with `+` and sits in the same row as the filters.

**Independent Test**: Open Books, Bank connections, Category rules, Periods and Journals; confirm each has one `+` create action in the filter row.

**Acceptance Scenarios**:

1. Given a create action, then it includes a `+` icon and a gap before the label.
2. Given the filters row, then the create action is aligned at the end of that row.
3. Given a user without create permission, then the action is hidden or disabled as before.

### User Story 2 - Cleaner page headers (Priority: P1)

As an accounting user, page content starts with the title from the shell, without a repeated explanatory paragraph.

**Independent Test**: Open each accounting page and confirm the shell title is followed directly by the working content.

**Acceptance Scenarios**:

1. Given Books, Bank connections, Category rules, Periods, Journals, Chart or Overview, then no page-level description paragraph is rendered.
2. Given contextual help inside a card or side panel, then it remains.

### User Story 3 - Chart actions aligned with tabs (Priority: P1)

As an accounting user, the chart add and more actions share the row with the account view tabs.

**Independent Test**: Open a populated chart and compare the tabs row with the action buttons.

**Acceptance Scenarios**:

1. Given a populated chart, then Add account and More actions are on the same row as the tabs.
2. Given an empty chart, then Add account remains in the onboarding card.
3. Given the actions row, then it wraps cleanly on narrow screens.
4. Given related setup, then only its icons appear beside the tabs with accessible labels.
5. Given the chart filters, then they use the same Settings chips and popovers as other Accounting pages.

## Requirements

- **FR-001**: Add a `+` icon to page-level accounting create buttons.
- **FR-002**: Render create actions inside the shared filter row via `useRecordFilters` actions.
- **FR-003**: Remove page-level descriptions from accounting pages.
- **FR-004**: Align chart Add/More with the chart view tabs.
- **FR-005**: Place Books, Category rules and Bank connections as icon-only actions in the same chart tabs row.
- **FR-006**: Make Add account the standard orange primary button.
- **FR-007**: Refactor chart filters to the standard Settings filter-chip pattern.
- **FR-008**: Keep contextual card/side-panel guidance and all permissions.
- **FR-009**: No route or API changes.

## Success Criteria

- **SC-001**: Every accounting create action has `+`.
- **SC-002**: Create actions align with filter chips.
- **SC-003**: No accounting page description remains.
- **SC-004**: Chart actions and tabs share one row.
- **SC-005**: `tsc -b`, lint, build and accounting i18n pass.

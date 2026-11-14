# Feature Specification: Filter popover standardization

**Feature Branch**: `010-filter-popover-standardization`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Standardize every filter popover in the system: spacing, focus behaviour, placeholder styling and label structure, across Accounting, Business Settings and Personal.

## User Scenarios & Testing

### User Story 1 - Predictable popover spacing (Priority: P1)

As a user opening any filter, the first control sits at the same distance from the popover title regardless of which page or filter type I use.

**Independent Test**: Open every filter popover in Accounting, Business Settings and Personal; compare the title-to-control gap.

**Acceptance Scenarios**:

1. Given a popover whose first control was wrapped in `mt-3`, then the extra top margin is removed.
2. Given any filter popover, then the body uses the standard Settings body padding.
3. Given Apply/Clear actions, then they use the same top gap.

### User Story 2 - Predictable focus (Priority: P1)

As a keyboard user, text and date filters receive focus on desktop, select-only filters do not auto-open, and mobile never focuses a field automatically.

**Independent Test**: Open a text filter, a date filter and a select filter on desktop and on a mobile viewport.

**Acceptance Scenarios**:

1. Given a desktop text filter, then its input is focused.
2. Given a desktop date filter, then the first editable date field is focused.
3. Given a desktop select-only filter, then the panel receives focus and the select remains closed.
4. Given a mobile viewport, then no field receives focus automatically.
5. Given Escape, then focus returns to the filter chip.

### User Story 3 - Consistent placeholders and labels (Priority: P1)

As a user, placeholders look identical in text inputs, date fields and select triggers, and popover titles are not repeated inside the body.

**Independent Test**: Compare the placeholder colour, size and weight in each filter type; open each popover and confirm there is no second visible label.

**Acceptance Scenarios**:

1. Given a text input placeholder, then it uses the filter placeholder token.
2. Given a date slot placeholder, then it uses the same token.
3. Given an empty select, then its placeholder uses the same token.
4. Given a popover, then the title is the only visible field label.
5. Given a select inside a popover, then it exposes an accessible name through `ariaLabel`.

### User Story 4 - Search is a filter item (Priority: P1)

As a user, Search behaves like the Settings/Categories search chip rather than a separate toolbar bar.

**Independent Test**: Open an Accounting list page and compare its filter row with Settings/Categories.

**Acceptance Scenarios**:

1. Given an Accounting filter row, then it includes a `Search` chip.
2. Given the Search chip, then it opens a Settings popover with a search input.
3. Given the search is applied, then the chip shows the value and a clear action.

## Requirements

- **FR-001**: All filter popovers use `appearance="settings"`.
- **FR-002**: Remove first-child top spacing inside filter popovers.
- **FR-003**: Desktop focus goes to the first editable text/date/textarea; select-only popovers focus the panel and never open the select.
- **FR-004**: Mobile never focuses a field automatically.
- **FR-005**: Standardize placeholder colour and size across text, date and select controls.
- **FR-006**: Popover titles are the only visible field labels; controls use accessible names.
- **FR-007**: Accounting search is a `Search` filter chip.
- **FR-008**: Document the rules in the design system.
- **FR-009**: No permission, route or API changes.

## Success Criteria

- **SC-001**: Every filter popover has the same body spacing.
- **SC-002**: Focus behaviour matches the matrix above.
- **SC-003**: Placeholders look consistent.
- **SC-004**: No duplicated visible field label inside a filter popover.
- **SC-005**: `tsc -b`, lint, build and accounting i18n pass.

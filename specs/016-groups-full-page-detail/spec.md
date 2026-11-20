# Feature Specification: Groups Full-Page Detail

**Feature Branch**: `016-groups-full-page-detail`
**Created**: 2026-11-20
**Status**: Draft
**Input**: Improve the Settings > Groups page so the groups list uses the full page width and selecting a group opens a full-page detail editor with a Back to groups action instead of a fixed right-hand panel.

## User Scenarios & Testing

### User Story 1 - Browse groups across the full page (Priority: P1)

As an administrator, I can see and search the groups list across the full settings content area, so group names, descriptions and access counts are not compressed into a narrow rail.

**Independent Test**: Open Settings > Groups at 360px, 768px and 1440px. Confirm the list uses the available content width, search and Add group remain visible, and cards reflow without horizontal overflow.

**Acceptance Scenarios**:

1. Given groups exist, when the page loads, then the groups list occupies the full settings content width and shows responsive group cards.
2. Given the user searches, when the query changes, then the full-width list filters without losing Add group or permission locks.
3. Given no group matches, then a localized empty state is shown in the full-width list.

---

### User Story 2 - Edit a group on a full-page surface (Priority: P1)

As an administrator, selecting a group opens a full-page editor with the group header, scope editor and permission explorer, so the editing surface is not constrained by a side rail.

**Independent Test**: Select a group at 360px and 1440px. Confirm the list is no longer shown beside the editor, the editor fills the content area, all existing actions remain available, and the page scrolls naturally.

**Acceptance Scenarios**:

1. Given the groups list, when a group is selected, then the page replaces the list with a full-width group editor.
2. Given the editor, when the user activates Back to groups, then the full-width groups list returns.
3. Given unsaved permission or scope changes, when the user attempts to go back, then a discard confirmation is shown before edits are lost.
4. Given a system group, when opened, then the editor remains read-only and destructive/rename/duplicate actions remain unavailable.

---

### User Story 3 - Preserve existing authorization and group workflows (Priority: P1)

As an administrator, the layout change does not alter permission codes, resource scopes, save/discard behavior, role restrictions or API contracts.

**Independent Test**: Create, rename, duplicate, save permissions/scopes and delete groups; verify the same API calls and outcomes as before.

**Acceptance Scenarios**:

1. Given a user without `manage_access`, when viewing the page, then create/edit/delete controls remain hidden or locked as before.
2. Given selected permission changes, when Save is used, then the existing scoped permission payload is sent unchanged.
3. Given a failed API call, then the existing localized snackbar feedback remains.

### Edge Cases

- Dirty editor + Back action.
- Busy/saving state while Back is pressed.
- Group detail load failure.
- Long group names/descriptions on mobile.
- Empty group list and filtered empty state.
- System groups and read-only permissions.

## Requirements

- **FR-001**: The groups list MUST use the full available settings content width with responsive cards.
- **FR-002**: Selecting a group MUST replace the list with a full-width detail editor, not a fixed right-hand panel.
- **FR-003**: The editor MUST provide a Back to groups action with a localized label and accessible name.
- **FR-004**: Back MUST confirm before discarding unsaved permission or scope changes.
- **FR-005**: Existing create, rename, duplicate, delete, save, discard, permission lock and scope editor behavior MUST remain unchanged.
- **FR-006**: The page MUST preserve the existing design system: `Card`, `Button`, `Input`, `Badge`, `EmptyState`, `ConfirmToast`, `settingsSurface` spacing/typography and responsive breakpoints.
- **FR-007**: No route, API, permission code, scope payload or backend contract change.
- **FR-008**: Localized copy MUST be added for Back to groups and the discard-back confirmation in all supported locales.
- **FR-009**: Keyboard and screen-reader behavior MUST remain usable; Back is a normal button with a clear accessible name.

## Success Criteria

- **SC-001**: At 360px, 768px and 1440px the groups page has no horizontal overflow and the full width is used.
- **SC-002**: A selected group shows only the full-page editor, with a visible Back to groups control.
- **SC-003**: Dirty Back actions require confirmation; clean Back actions return immediately.
- **SC-004**: Existing group/permission regression tests, TypeScript, ESLint and production build pass.
- **SC-005**: No authorization or API behavior changes are observed in authenticated group tests.

## Assumptions

- The existing group APIs and permission payloads remain unchanged.
- Settings layout already provides the page frame and heading; this feature only changes the child page composition.
- The groups list is expected to remain modest in size; client-side search is retained.

# Feature Specification: Collapsed Sidebar Tooltips

**Feature Branch**: `005-collapsed-sidebar-tooltips`
**Created**: 2026-11-14
**Status**: Draft
**Input**: When a sidebar is retracted, show a styled tooltip on hover/focus for every sidebar button, in both Business and Personal modules.

## User Scenarios & Testing

### User Story 1 - Understand collapsed rail actions (Priority: P1)

As a user with a retracted sidebar, I can hover or focus an icon-only row and see its label in a styled tooltip, so I can navigate without guessing what each icon means.

**Independent Test**: Collapse each rail at 768px+ and hover/focus every icon-only row, footer link, workspace switcher and user menu. Confirm the correct localized label appears next to the row.

**Acceptance Scenarios**:

1. Given a collapsed Business workspace sidebar, when I hover or focus a nav row, then a dark rounded tooltip appears to the right with the row label.
2. Given a collapsed Settings or Accounting sidebar, when I hover or focus a nav row or footer action, then the matching tooltip appears.
3. Given a collapsed Personal sidebar or Personal settings sidebar, when I hover or focus a nav row, action button or footer link, then the matching tooltip appears.
4. Given the rail is expanded, when I hover an item, then no styled tooltip appears because the label is already visible.
5. Given a mobile drawer, when it is open, then labels are visible and the collapsed-only tooltip is not shown.

### User Story 2 - The tooltip stays readable and unobtrusive (Priority: P2)

As a user, I want the tooltip to feel part of the shell: anchored to the icon, clamped to the viewport, dismissible and accessible.

**Independent Test**: Hover rows near the top/bottom of the viewport, focus via keyboard, press Escape, and resize/scroll the rail.

**Acceptance Scenarios**:

1. Given a row near the viewport edge, when the tooltip would overflow, then it flips to the left or is clamped vertically.
2. Given keyboard focus on a collapsed row, then the tooltip opens without requiring a mouse.
3. Given the tooltip is open, when I press Escape or leave the row, then it closes promptly.
4. Given reduced motion, then the tooltip appears without animation.
5. Given the rail scrolls, then the tooltip follows or closes rather than detaching from the row.

## Requirements

- **FR-001**: Create one shared `SidebarTooltip` primitive; do not duplicate tooltip positioning or styling in each rail.
- **FR-002**: Show the tooltip only when the rail is collapsed on desktop; never in expanded or mobile-drawer states.
- **FR-003**: Cover every interactive collapsed rail item: Business workspace nav/actions/settings, Settings nav/back, Accounting nav/settings/back, Personal nav/actions/settings, Personal settings nav/back, workspace switcher and user menu.
- **FR-004**: Replace native `title` tooltips on covered items with the styled tooltip; keep localized accessible names on the controls.
- **FR-005**: Use a dark compact surface with an arrow, portal to `document.body`, `role="tooltip"`, viewport clamping and edge flipping.
- **FR-006**: Open on hover and keyboard focus; close on leave, blur, click, Escape, scroll detachment or viewport resize.
- **FR-007**: Respect reduced motion and use the existing tooltip z-layer and motion tokens.
- **FR-008**: No route, permission, API, payload or behavior changes.

## Success Criteria

- **SC-001**: Every collapsed icon-only rail item shows the correct localized tooltip.
- **SC-002**: No styled tooltip appears while the rail is expanded or on mobile.
- **SC-003**: Tooltips stay inside the viewport and flip correctly near edges.
- **SC-004**: Keyboard focus opens the tooltip; Escape and blur close it.
- **SC-005**: `npm run lint` and `npm run build` pass; responsive checks at 768px and 1440px show no layout shift.

## Assumptions

- Desktop rails collapse at `md` (768px); mobile drawers keep labels visible.
- Existing localized labels remain the source of truth for tooltip text.
- `InfoTooltip` remains the explanatory-info primitive; `SidebarTooltip` is the compact navigation-label primitive.

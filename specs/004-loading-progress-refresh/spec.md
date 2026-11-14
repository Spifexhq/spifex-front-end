# Feature Specification: Loading Progress Refresh

**Feature Branch**: `004-loading-progress-refresh`
**Created**: 2026-11-14
**Status**: Draft
**Input**: Refactor the loading bars so they no longer sit above page chrome or floating components, and replace the current motion with a smoother, more polished loading animation.

## User Scenarios & Testing

### User Story 1 - The progress bar stays inside the page content (Priority: P1)

As a user, I want the loading bar to belong to the page content area so it never draws over the navigation, sidebar, dialogs, popovers or toasts.

**Independent Test**: Trigger a page save/refresh on Business Settings, Accounting, Reports and Onboarding, then open a dialog or popover while the request is running. Confirm the bar stays at the top of the content scroll area and below floating layers.

**Acceptance Scenarios**:

1. Given the content area is scrolled, when a request starts, then the bar sticks to the top of the content scroll area and remains visible.
2. Given a modal, side panel, popover or toast is open, when a request starts, then the bar does not paint above it.
3. Given a settings or accounting page with its own sidebar, when a request starts, then the bar starts at the content edge rather than spanning the full viewport.
4. Given the page has no scroll, when the request starts, then the bar aligns with the top of the page content without shifting the layout.

### User Story 2 - The loading motion feels polished (Priority: P2)

As a user, I want loading feedback to feel smooth and deliberate rather than mechanical or visually noisy.

**Independent Test**: Trigger top and center progress states and compare them with reduced motion enabled and disabled.

**Acceptance Scenarios**:

1. Given normal motion, when the bar is active, then a single soft accent gradient segment sweeps continuously across a neutral track.
2. Given the bar becomes active or inactive, then it fades in/out without a hard flash.
3. Given reduced motion is enabled, then the bar is static, calm and still communicates activity.
4. Given a blocking bootstrap/auth load, then the center variant shows a minimal centered line with no visible words, borders or shadows.

### User Story 3 - Skeletons share the refined motion language (Priority: P3)

As a user, I want skeleton placeholders to shimmer lightly instead of pulsing opaquely, so the whole product has one loading language.

**Independent Test**: Load a settings page, dashboard and table on a throttled connection; confirm skeleton lines use a single gentle shimmer and remain static under reduced motion.

**Acceptance Scenarios**:

1. Given a skeleton is visible, then its lines show a slow highlight sweep rather than an opacity pulse.
2. Given reduced motion, then skeleton lines remain static.
3. Given many skeleton lines render together, then the effect remains subtle and does not obscure layout.

## Requirements

- **FR-001**: `TopProgress` top variant uses in-flow sticky positioning at the top of the content scroll area, with zero layout shift.
- **FR-002**: The bar sits below navbar/sidebar geometry and below modals, popovers and toasts in the stacking order.
- **FR-003**: Use a neutral track plus one accent gradient sweep. Keep the treatment minimal: no secondary shine, visible words, borders or shadows. Use existing design tokens and motion durations; do not introduce new accent colors.
- **FR-004**: Fade the bar in/out over the standard motion duration and suppress all animation under reduced motion.
- **FR-005**: Refine the center variant into a minimal centered line with a localized accessible label; keep it non-interactive.
- **FR-006**: Upgrade `SkeletonLine` to a calm shimmer sweep and keep it static under reduced motion.
- **FR-007**: Remove the obsolete `topOffset` prop and update every call site.
- **FR-008**: Provide a localized progressbar label and hide inactive bars from assistive technology, without duplicate live-region announcements.
- **FR-009**: No route, permission, API, payload or copy changes.

## Success Criteria

- **SC-001**: Top progress never overlaps the sidebar, navbar, dialogs, popovers or toasts.
- **SC-002**: The bar remains visible while the content area scrolls.
- **SC-003**: Top and center variants animate smoothly and are static under reduced motion.
- **SC-004**: Skeleton lines shimmer consistently across page and table skeletons.
- **SC-005**: `npm run lint` and `npm run build` pass; visual checks at 360px and 1440px show no overflow or layout shift.

## Assumptions

- All top progress usages live inside the application content scroll region.
- Existing `--accentPrimary`, `--accentPrimaryHover`, `--motion-*`, `--ease-out` and shadow tokens remain canonical.
- The app shell continues to own the scroll container (`#app-page-scroll`).

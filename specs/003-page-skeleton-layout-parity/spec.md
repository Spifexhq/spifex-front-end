# Feature Specification: Page Skeleton Layout Parity

**Feature Branch**: `003-page-skeleton-layout-parity`
**Created**: 2026-11-13
**Status**: Draft
**Input**: Adjust page loading skeletons so every first-load skeleton follows the same container, spacing and composition as the page it replaces.

## User Scenarios & Testing

### User Story 1 - Skeletons match their pages (Priority: P1)

As a user opening a page that is still loading, I see a skeleton that occupies the same page frame and mirrors the same sections as the loaded page, so the transition does not jump or look like a different screen.

**Independent Test**: For each affected route, throttle or block its first request, compare the skeleton at 360px and 1440px with the loaded page (container padding, max width, section order, table/card placement).

**Acceptance Scenarios**:

1. Given a settings list page loads, when the skeleton renders, then it uses the settings page frame (`.settings-page`/`.settings-content`), a toolbar row and a table skeleton in the same position as the loaded table.
2. Given a settings profile page loads, when the skeleton renders, then it shows the same 12-column split of section cards as the loaded page instead of a generic table.
3. Given a master/detail page loads, when the skeleton renders, then it shows the list rail and detail panel in the same grid as the loaded page.
4. Given an accounting page loads inside the accounting workspace, when the skeleton renders, then it does not add a second page gutter or duplicate the workspace heading.
5. Given a page already renders its title in a layout heading, when it loads, then the skeleton does not render a second fake title/action row.

### User Story 2 - Loading does not duplicate page chrome (Priority: P2)

As a user on a slow connection, I want existing headings, navigation and page containers to stay stable while only the content region is replaced by a skeleton.

**Independent Test**: Open Business Settings, Personal Settings and Accounting routes with network throttling; confirm the real heading stays visible and the skeleton starts below it with one gutter.

**Acceptance Scenarios**:

1. Given Business Settings renders its heading in `SettingsLayout`, when the child route is loading, then the heading remains and the skeleton starts below it.
2. Given Personal pages render inside `PersonalLayout`'s padded main, when a page or route chunk loads, then the skeleton is content-only and does not add a second gutter.
3. Given Accounting renders its page container in `AccountingWorkspace`, when a page loads, then the skeleton is content-only inside that container.

### User Story 3 - Reusable, accessible skeleton variants (Priority: P3)

As a frontend contributor, I can reuse named page-skeleton variants and shells instead of copying one-off loading markup.

**Independent Test**: Inspect the shared `PageSkeleton` API and all page-level call sites; verify each uses a layout variant and shell that matches its page.

**Acceptance Scenarios**:

1. Given a new list or settings page, when I need a first-load skeleton, then `PageSkeleton` offers a matching variant and a clearly named shell.
2. Given a skeleton is visible, when assistive technology reads it, then it exposes one busy status with a localized label and the decorative shapes stay hidden.
3. Given reduced motion is preferred, when the skeleton renders, then it does not animate.

## Requirements

- **FR-001**: Make `PageSkeleton` content-only by default: no page gutter, max-width container or fake page title. Provide explicit shells for full-page and settings-page frames.
- **FR-002**: Add layout variants that mirror the real page compositions: list/table, settings table, profile form split, narrow side-card split, single settings panel, settings form panel, master/detail groups, settings list, dashboard, billing, onboarding, import review, accounting list, correlation explorer and stacked fields.
- **FR-003**: Keep page headings owned by layouts. Do not render duplicate headings or action buttons when the surrounding layout already renders them.
- **FR-004**: Use the existing design system: `PageSkeleton`/`DataTableSkeleton`, `SkeletonLine`, `rounded-lg` panels, `rounded-xl` dashboard cards, `border-gray-200`, `bg-gray-50` headers, `space-y-5` page rhythm, `max-w-[1440px]`, `px-4 py-6 sm:px-7`, and the settings surface classes.
- **FR-005**: Update every page-level `PageSkeleton` call site to the matching variant/shell. Table-region skeletons continue to use `DataTableSkeleton`.
- **FR-006**: Preserve accessibility: `role="status"`, `aria-busy="true"`, localized `sr-only` label, decorative content `aria-hidden`, reduced-motion safe animation.
- **FR-007**: Preserve responsive behavior at 360px and 1440px; no horizontal overflow and no forced multi-column layouts below the documented breakpoints.
- **FR-008**: No route, permission, API contract, payload, copy or financial behavior changes. No new user-visible strings.

## Success Criteria

- **SC-001**: All page-level first-load skeletons render inside the same container and gutter as their loaded page.
- **SC-002**: Settings list pages, profile pages, master/detail pages, accounting pages, dashboard, onboarding, import review, billing and locale setup each show a skeleton matching their loaded section order.
- **SC-003**: No skeleton renders a duplicate page title/action row when the layout already provides page chrome.
- **SC-004**: `npm run build`, `npm run lint` and TypeScript checks pass; responsive spot checks at 360px and 1440px show no overflow.
- **SC-005**: The shared skeleton API is documented by named variants and used consistently across the audited call sites.

## Assumptions

- Page data continues to expose the same first-load booleans; only presentation changes.
- Existing `DataTableSkeleton`, `SkeletonLine` and layout containers remain canonical.
- Settings pages continue to be hosted inside `SettingsSurface`; Personal settings continue to rely on `PersonalLayout`/`PersonalSettingsLayout` padding.

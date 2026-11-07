# Feature Specification: Personal Settings Navigation and Unified Billing UI

**Feature Branch**: `001-personal-settings-billing`
**Created**: 2026-11-07
**Status**: Draft
**Input**: User request to make billing pages consistent, give Spifex Personal an Enterprise-style settings sidebar and pages, and align Personal's main sidebar—including the collapsed workspace control—with Enterprise.

## User Scenarios & Testing

### User Story 1 - Navigate Personal settings by page (Priority: P1)
As a Personal workspace user, I want a dedicated settings sidebar with focused pages, so I can find identity details, preferences, security, billing and workspace controls without a long tab strip.

**Independent Test**: Navigate to each Personal settings route using the sidebar; verify the combined identity page contains profile, address and sensitive details, and verify active state, existing forms, keyboard navigation and mobile drawer behavior.

**Acceptance Scenarios**:
1. Given a Personal workspace, when I open Settings, then its sidebar uses the Enterprise visual pattern and provides a combined identity page plus separate preferences, billing, security and workspace destinations.
2. Given a Personal setting shared with Enterprise, when I open that area, then it uses the same page component and behavior where the information and permissions are equivalent.
3. Given a legacy `/personal/settings?section=...` URL, when it is opened, then the intended new settings route is selected without losing the section.
4. Given a non-Personal workspace, when I open a Personal settings route, then existing product routing guards return me to the Business workspace.

### User Story 2 - See a consistent billing experience (Priority: P1)
As an owner in either product, I want plan status, plan choices, prices, and billing actions presented with the same layout and interaction pattern.

**Independent Test**: Open billing in Business and Personal workspaces; compare layout and verify each page loads the active workspace category's catalog and subscription status and starts the matching checkout/portal action.

**Acceptance Scenarios**:
1. Given a Business or Personal workspace, when I open its billing page, then status, notices, plan cards, and action hierarchy use one shared visual component.
2. Given different product catalogs or billing currencies, when billing loads, then the same layout displays the correct product-specific plans and prices.
3. Given an unavailable price, non-owner role, read-only workspace, or backend error, when billing loads, then actions are safely disabled or an actionable error is shown.
4. Given an active subscription, when I choose manage billing, then the existing customer portal flow is used; checkout and portal are not submitted during visual verification.

### User Story 3 - Use consistent Personal navigation (Priority: P2)
As a Personal workspace user, I want the main sidebar to use the same sections, active states, spacing, and collapsed behavior as Enterprise.

**Independent Test**: Inspect expanded, collapsed, and mobile Personal navigation and compare its interaction model with Enterprise.

**Acceptance Scenarios**:
1. Given the Personal sidebar is expanded, when I browse its links, then logical section dividers and active states match Enterprise's sidebar.
2. Given the Personal sidebar is collapsed, when I view the workspace switcher, then its icon is centered in a square control and its hover/focus/size match navigation buttons.
3. Given a mobile viewport, when I open Personal navigation, then it retains the Enterprise drawer, backdrop, focus, scroll-lock, and close behavior.

### User Story 4 - Keep Personal account settings together (Priority: P1)
As a Personal workspace user, I want profile, contact, address, and sensitive personal details on one account settings page, so I can manage related identity information in the same place as Enterprise users.

**Independent Test**: Open Personal Settings > Personal; verify all identity fields and existing update actions are on that page, while security, preferences, billing and workspace management remain separate settings destinations.

### User Story 5 - Manage workspaces from Settings (Priority: P1)
As an owner, I want a dedicated Workspaces settings page in both products for workspace lifecycle actions, so the main workspace switcher stays focused on choosing or creating a workspace.

**Independent Test**: Open Workspaces under Enterprise and Personal settings; verify workspace listing, deletion countdown, owner/last-workspace restrictions, password confirmation and deletion acknowledgement. Open the main workspace switcher and verify there are no delete controls.

## Edge Cases

- A workspace has legacy Personal settings query parameters.
- A catalog returns no paid plans or a currency has no matching price.
- The account is a member rather than owner, or the workspace is read-only/deletion-pending.
- The subscription status and catalog requests fail independently.
- Translations are longer than English and the settings sidebar is collapsed or mobile.
- Existing Business routes, permission checks, and billing redirects must remain compatible.

## Requirements

### Functional Requirements

- **FR-001**: Personal settings MUST use a settings-specific sidebar following Enterprise's settings layout and interaction pattern. The profile, contact, address, and sensitive personal data fields MUST be grouped into one Personal page, matching Enterprise's Personal settings organization.
- **FR-002**: Personal settings MUST retain profile, address, sensitive personal data, format, currency, security, notification, billing, and workspace management capabilities.
- **FR-003**: Equivalent settings pages MUST reuse the existing shared Enterprise/account-settings page component when its data contract and authorization behavior are suitable.
- **FR-004**: Existing Personal settings query URLs MUST redirect to equivalent dedicated paths.
- **FR-005**: Business and Personal billing MUST render through a single shared presentation component while loading the active workspace category's plan catalog and subscription state.
- **FR-006**: Billing actions MUST preserve owner, subscription, read-only, entitlement, price-availability, and error handling safeguards.
- **FR-007**: The Personal main sidebar MUST use Enterprise's section hierarchy, active/hover/focus styles, collapse behavior, and mobile drawer mechanics.
- **FR-008**: The workspace switcher button in either product sidebar MUST use the same sidebar row style and center its icon as a square control when collapsed; the embedded full-width workspace manager control may retain its page layout.
- **FR-009**: All new and changed labels MUST be translated in the supported locales.
- **FR-010**: No backend schema, billing contract, price configuration, or live subscription state is changed by this feature.
- **FR-011**: Enterprise and Personal MUST each provide a dedicated Workspaces settings page with workspace lifecycle controls.
- **FR-012**: Delete workspace controls MUST appear only in the dedicated Workspaces settings pages; workspace switcher dialogs MUST NOT expose deletion actions.
- **FR-013**: Workspace deletion MUST retain existing password, acknowledgement, last-active-owned-workspace, deletion-retention, and billing-cancellation safeguards.
- **FR-014**: Workspace switcher labels MUST be left aligned with the same icon/text alignment as neighboring sidebar actions.

## Success Criteria

- **SC-001**: Personal settings areas are reachable from the Personal settings sidebar, with all account identity fields consolidated on one Personal page.
- **SC-002**: Business and Personal billing share a single rendered component and present matching status, plan, and action structures.
- **SC-003**: Collapsed Personal and Business sidebars render the workspace switcher in a centered 36px square matching neighboring icon buttons.
- **SC-004**: Existing Business route/permission behavior and Personal read-only safeguards remain intact.
- **SC-005**: Desktop and 390px mobile browser review confirms no clipped labels, overlapping actions, or inaccessible navigation controls.
- **SC-006**: Both product Settings sidebars link to a Workspaces page, and neither product's workspace switcher dialog presents a delete action.

## Assumptions

- Existing account-settings components are the source of truth for equivalent Personal/Business profile, security, notification, format, and currency behavior.
- Personal-specific address and sensitive profile data remain governed by the existing Personal APIs and encryption/access behavior.
- Business/Personal plan catalog and checkout endpoints already support category-specific billing.
- Browser verification uses local sample workspaces only and does not modify subscription or workspace data.

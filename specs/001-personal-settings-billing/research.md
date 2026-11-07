# Research and pre-implementation analysis

## Current behavior

- Personal has a single `/personal/settings` page with its own horizontal `section` segmented control. It combines profile, address, personal/sensitive data, and links/components for formats, currency, security, notifications, plans and workspace management.
- Enterprise already has a routed settings shell with an independent `SidebarSettings` drawer, settings headings, and page-level routes. It reuses the shared account-settings features for personal profile, security, notifications, currency, formats, billing, and subscription result pages.
- Business billing currently uses a dedicated implementation with status-specific callouts and linear plan rows. Personal billing uses a separate grid of plan cards and a simpler current plan state. Both categories have catalog-aware billing APIs; the backend keys checkout to active workspace category and enforces owner/price rules.
- `SidebarFrame` already provides rail widths, animation, mobile backdrop/scroll lock, brand, and fixed footer structure. Personal uses it but has no labeled navigation sections or Enterprise-equivalent selected row treatment.
- `WorkspaceSwitcher` currently renders a generic button, distinct from `.sidebar-row`; its compact width/centering does not inherit the shared collapsed rail geometry. The embedded `manage` instance must remain a broad page action.

## Decisions

- Keep product route ownership: new Personal settings child routes stay under `products/personal`; do not route Personal users through Business permission paths.
- Reuse shared account-settings pages only for equivalent profile/security/notification/currency/format data. Keep Personal-specific address and sensitive profile forms in Personal-owned pages and preserve the existing endpoints/read-only gate.
- The shared billing component will get category and workspace identity from auth context, fetch country and category catalog plus subscription status, and use the existing `workspaceApi.checkout` and customer portal APIs. No backend change is required.
- Keep Business billing route and permissions unchanged; replace only its page implementation with the shared UI. Retain loading/error/retry and owner/read-only guards.
- The old Personal `/personal/settings?section=...` URLs will resolve through an explicit section-to-child route map. The root settings URL opens `profile`.
- For sidebars, use the shared row/brand/user controls and existing CSS motion contract, not another one-off collapsed layout. The workspace switcher's `manage` variant remains page-width.

## Open risks checked

- Existing settings page components make requests through auth-scoped APIs; verify profile and currency components use the current workspace context before reuse. Currency changes must continue to be blocked after financial history as enforced by backend.
- The old Business subscription page has many status branches. The shared implementation must preserve active, trialing, past-due, incomplete, unpaid, canceled and no-subscription actions and status messaging.
- Long translations can pressure Personal sidebar widths; retain truncation in collapsed/expanded rails and mobile drawer scroll.

## Out of scope

- Billing price changes, Stripe portal actions in verification, subscription migrations, backend/API/model changes, and changes to Business settings routes or permissions.

## Follow-up discovery · 2026-11-07

- Enterprise's `/settings/personal` is already the combined identity page: personal/contact fields, address, timezone, sensitive profile data, and in-page links to security and formats. It writes through `identity/profile/`. It optionally shows the organization name to owners; Personal must disable that organization-only block and route security/format links to Personal settings paths.
- Personal `PersonalSettingsSections` currently splits identity data into three pages. That split is unnecessary because the existing combined Enterprise page supports the same profile API/model and modal; reusing it with a product prop better fulfills the user's parity requirement.
- Enterprise Organization Settings currently embeds `<WorkspaceSwitcher manage/>`. Workspace creation/replacement belongs in the settings lifecycle area too, while deletion must move to a dedicated Workspaces page. The existing switcher is one shared component used in both product sidebars; removing deletion there protects both products centrally.
- The switcher trigger is a native `button`; browser button defaults can center text. Add `text-left` to its `.sidebar-row` variant to match sidebar navigation links.
- Workspace deletion is already supported by `workspaceApi.scheduleDeletion(id, password, idempotencyKey)` and requires explicit acknowledgement in the frontend. The dedicated page should retain the 90-day countdown, cancellation warning, password and acknowledgement flow, owner-only control, and last-active-owned-workspace guard. No API or schema change is needed.
- Business Settings routes are grouped under `/settings` and `SidebarSettingsDesktop` filters navigation by existing permissions. The new `/settings/workspaces` page can use the existing owner/organization settings permission. Personal routes remain under `/personal/settings` and use its existing `WorkspaceSwitcher manage` entry point.

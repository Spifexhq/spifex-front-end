# Implementation Plan: Personal Settings Navigation and Unified Billing UI

**Branch**: `001-personal-settings-billing` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

## Summary

Replace Personal settings' single tabbed page with an Business-style settings layout and routes, keeping all identity/contact/address/sensitive fields together in one Personal page. Reuse equivalent account-settings pages. Consolidate the two plan pages into one category-aware billing UI. Add dedicated Workspaces settings pages under both products, keep workspace deletion out of switcher dialogs, and align the switcher label with neighboring sidebar actions.

## Technical Context

**Language/Version**: TypeScript 5 / React
**Primary Dependencies**: React Router, React i18next, Redux, existing Tailwind and shared UI
**Storage**: None changed
**Testing**: TypeScript project build, focused workspace/billing UI checks, local browser review
**Target Platform**: Web desktop and mobile
**Project Type**: Frontend SPA
**Performance Goals**: Keep route-level lazy loading and avoid loading unrelated settings pages until routed.
**Constraints**: Preserve Business routes/permissions, Personal API behavior and workspace lifecycle protections; no new dependency or backend contract.
**Scale/Scope**: Personal routes/layout/sidebar; shared billing component and both product entry points; shared workspace switcher sidebar presentation.

## Constitution Check

- Product boundaries remain explicit: Personal settings routes live in Personal routes; Business setting routes remain unchanged.
- Shared settings surfaces are reused only where data model and access rules match.
- Billing uses active workspace product category, catalog and current subscription; no duplicated billing presentation.
- No database/API migrations or live billing actions.
- Responsive design follows the shared SidebarFrame and Business settings navigation patterns.
- Translation keys are provided for all supported locales.

## Design Decisions

1. Keep the Personal settings shell and route, but consolidate profile, address and sensitive data in one screen using the existing Business `PersonalSettings` presentation and modal; hide Business-only company details and adapt in-product navigation through an optional product context.
2. Keep old `/personal/settings?section=<key>` links compatible by mapping identity-related keys to the unified `personal` route and retaining destinations for formats, currency, security, notifications, billing and workspaces.
3. Add `/personal/settings/workspaces` and `/settings/workspaces`, link both from their settings sidebars, and render a dedicated shared workspace management page there.
4. Move workspace deletion actions and the existing password/acknowledgement flow out of `WorkspaceSwitcher` into the dedicated page. Keep switching and create/change-product flows in the switcher. Preserve server-side restrictions and lifecycle behavior.
5. Create a single shared `WorkspaceBillingSettings` component. It fetches the active workspace's category catalog, profile country and subscription status, renders one consistent status panel and plan-card layout, and uses existing category-aware checkout/customer portal APIs. Replace Business and Personal billing page internals with thin wrappers or imports.
6. Use `SidebarFrame`, `SidebarBrand`, `SidebarUserConfiguration`, shared motion styles and the same section/link styles for Personal settings and main navigation. Explicitly set workspace switcher button text alignment to match sidebar links.

## Project Structure

```text
src/
├── features/workspaces/components/
│   ├── WorkspaceBillingSettings.tsx       # shared category-aware plan/status UI
│   └── WorkspaceSwitcher.tsx              # consistent sidebar trigger; manager stays full-width
├── products/personal/
│   ├── layouts/PersonalSettingsLayout.tsx  # settings shell and settings sidebar
│   ├── components/PersonalSettingsSidebar.tsx
│   ├── pages/PersonalSettings/             # consolidated identity page + settings landing redirect
│   ├── layouts/PersonalLayout.tsx          # section-based main navigation
│   └── routes/index.tsx                    # nested routes and legacy compatibility redirects
└── features/account-settings/pages/SubscriptionManagement/index.tsx # Business wrapper/shared UI
```

## Implementation Sequence

1. Preserve Personal identity update behavior but place profile, address and sensitive fields together like Business Personal settings.
2. Add a Workspaces page to each product Settings route and sidebar; move delete control/confirmation into that page while retaining switch/create flows in the dialog.
3. Consolidate billing presentation and hook both product routes to its category-aware data and actions.
4. Align Personal main sidebar sections and WorkspaceSwitcher rail styling without changing workspace selection semantics.
5. Run frontend checks; review current subscription and error/empty/unavailable states; use local browser at desktop and 390px mobile. Do not initiate checkout or delete workspaces.

## Risks and Mitigations

- Shared account-settings components may contain Business-only assumptions. Review their API and permission use before reusing; retain a Personal wrapper where needed.
- Billing status can be different from catalog availability. Treat status and catalog as independent reads and keep actions disabled until both resolve.
- Route compatibility must preserve query filters. Map existing `section` keys explicitly and make unknown values safe.
- Tailwind responsive styling can differ between full page and sidebar contexts. Keep manage mode's current button layout and verify the rail collapsed and expanded states.

## Validation Strategy

- `npx --no-install tsc -b --pretty false`
- Run relevant existing Personal/workspace frontend checks, if present.
- Browser inspect Business and Personal billing; compare shared component structure and price/status behavior.
- Browser inspect Personal settings routes and legacy query redirects; confirm active sidebar states.
- Browser inspect the Personal sidebar at desktop expanded/collapsed and 390px mobile, including workspace switcher alignment.
- `git diff --check` in the frontend repository.

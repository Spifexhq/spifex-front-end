# Tasks: Personal Settings Navigation and Unified Billing UI

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md)

## Phase 1: Separate Personal settings pages

- [x] T001 [US1] Consolidate Personal profile, address and sensitive data with the Enterprise Personal settings page and preserve product-specific navigation and data visibility.
- [x] T002 [US1] Add `src/products/personal/layouts/PersonalSettingsLayout.tsx` and `src/products/personal/components/PersonalSettingsSidebar.tsx` using shared `SidebarFrame`, Enterprise settings sections/active rows and `SidebarUserConfiguration`.
- [x] T003 [US1] Add nested Personal settings routes for the combined Personal identity page, formats, currency, security, notifications, billing and workspaces; map legacy identity section values to the combined page.
- [x] T004 [US1] Add translated Personal settings navigation labels and page headings for en, pt, fr and de.

## Phase 2: Unify billing surface

- [x] T005 [US2] Implement a shared category-aware `WorkspaceBillingSettings` surface that combines catalog, status, status-specific messaging, prices, owner/read-only gates, checkout and portal actions.
- [x] T006 [US2] Replace Personal plan cards and Business subscription presentation with the shared billing component without changing routes, permission middleware, or backend contracts.

## Phase 3: Align main sidebar

- [x] T007 [US3] Group Personal main navigation into labeled sections and apply Enterprise-equivalent selected/hover/focus styles.
- [x] T008 [US3] Make non-manage `WorkspaceSwitcher` triggers use the common `.sidebar-row`/icon/label classes so collapsed buttons are square and centered; leave manage variant full-width.

## Phase 4: Validation

- [x] T009 [US1/US2/US3] Run TypeScript, locale JSON, production build and diff checks. All passed; the build emitted existing upstream `use client`, source-map and large-chunk warnings.
- [ ] T010 [US1/US2/US3] Review the live Personal settings, workspace manager, Personal/Business billing and collapsed/expanded/mobile sidebars at desktop and 390px widths. Requires an authenticated browser session; not available in this implementation pass.

## Follow-up: Consolidated identity and workspace lifecycle pages

- [x] T011 [US1] Reuse the Enterprise combined Personal settings page for Personal routes, suppress organization-only content there, and route its security/format links within Personal.
- [x] T012 [US5] Add a shared dedicated workspace management page and expose it from Enterprise and Personal Settings routes/sidebars.
- [x] T013 [US5] Move workspace deletion confirmation and actions from WorkspaceSwitcher to the dedicated page while preserving password, acknowledgement, countdown, ownership and minimum-workspace safeguards.
- [x] T014 [US3] Left-align workspace switcher button text and keep its icon/label row aligned with neighboring sidebar actions.
- [x] T015 [US1/US5] Run TypeScript/build/translation/diff checks and record any outstanding browser review.

## Convergence

- Personal identity fields now use the same combined component and modal structure as Enterprise. Personal hides the company block and routes in-page links to Personal security and format paths.
- Both Settings sidebars expose `/settings/workspaces` or `/personal/settings/workspaces`; both render the same workspace management page.
- Workspace switcher dialogs retain selecting/creating/product-change behavior, and contain no deletion action. The page-level delete action retains the existing API, password, confirmation checkbox, countdown and guardrails.
- The switcher trigger explicitly uses left text alignment so the label follows its icon like neighboring sidebar links.
- TypeScript, targeted ESLint, production build, locale JSON parsing and `git diff --check` pass. Live authenticated desktop/mobile browser review remains unverified (T010).

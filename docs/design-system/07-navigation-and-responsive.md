# 07 — Navigation and Responsive Behavior

## 1. Shell structure

**Business shell:** `src/products/business/layouts/ApplicationShell.tsx`

```
<div class="app-shell h-[100dvh] overflow-hidden bg-white text-gray-900">
  <div class="fixed inset-y-0 left-0 z-40" />            ← sidebar portal slot
  {!section && !pageHasActions && <Sidebar … />}          ← rail (workspace mode)
  <div class="app-shell-content md:ml-[248px] | md:ml-[72px]">
    <Navbar />                                            ← h-16, z-30
    <WorkspaceLifecycleBanner />
    <div id="app-page-scroll" class="overflow-y-auto">{children}</div>
  </div>
</div>
```

- Three navigation modes share one collapse state machine: workspace, settings,
  accounting. Persistence keys: `spifex.workspace.collapsed`,
  `spifex.settings.collapsed`, `spifex.accounting.collapsed`.
- `AppShellContext` exposes `collapsed`, `toggleCollapsed`, `mobileOpen`,
  `toggleMobile`, `closeMobile`, `sidebarSlot`, `openHelp`, `financialRevision`.
- Mobile state closes on route change and when the viewport crosses 768px.

## 2. Sidebar

**Shared rail:** `src/shared/layout/Sidebar/SidebarFrame.tsx`
**Business content:** `src/products/business/components/Sidebar/SidebarNavigation.tsx`
**Settings content:** `src/products/business/components/SettingsSidebar/SidebarSettings.desktop.tsx`
**Accounting content:** `src/products/business/pages/Accounting/components/AccountingSidebar.tsx`

`SidebarFrame` owns the header, width, backdrop, focus trap, Escape, body scroll
lock and `inert` behavior. `position="rail"` (workspace) is sticky; 
`position="section"` (settings/accounting) is fixed at the left edge, with the
content offset supplied by `ApplicationShell`.

| Property | Desktop | Mobile |
| --- | --- | --- |
| Width | 248px expanded, 72px collapsed | `min(280px, 85vw)` |
| Position | `sticky` rail / `fixed` section | `fixed inset-y-0 left-0` |
| Header | `h-20`, brand + toggle | same, toggle becomes X |
| Background | `bg-gray-50`, `border-r border-gray-200` | same |
| Rows | 36px min height (40px target on mobile) | 36px, 40px target |
| Scroll | `.sidebar-scroll` independent | same |
| z-index | 40 slot / 50 section | 95 panel / 90 backdrop |
| Focus | trap while open | trap, `inert` when closed |

**Animation:** `sidebar-motion.css` — desktop width/transform 220ms
`cubic-bezier(.22,1,.36,1)`; mobile drawer 260ms with a 240ms backdrop fade.
Labels clip (no reflow); transitions are disabled under reduced motion.

**Mobile behavior (required):**

1. Backdrop `bg-gray-950/25 backdrop-blur-[2px]`, click closes.
2. `role="dialog" aria-modal="true"` on the open mobile rail.
3. `inert` on the rail when closed.
4. Body scroll locked while open.
5. Escape closes, unless another modal dialog is open above it
   (`SidebarFrame` checks for `[role="dialog"][aria-modal="true"]`).
6. Route change closes the rail.

**Toggle:** `aria-expanded`, `aria-controls`, localized `aria-label`/`title`;
desktop icons `PanelLeftClose`/`PanelLeftOpen`, mobile `X`.

## 3. Navbar

**Canonical:** `src/shared/layout/Navbar/Navbar.tsx`

- Height 64px, `border-b border-gray-200 bg-white px-4 sm:px-6`, `z-30`.
- Left: mobile menu button (`md:hidden`, 44px), page icon (`sm:block`),
  breadcrumbs.
- Breadcrumbs: `text-[13px]`, `gap-1.5 sm:gap-2`, current page `font-medium
  text-gray-700` + `aria-current="page"`, parents `text-gray-500 hover:text-gray-900`.
  Derived from `getPageBreadcrumbs(pathname)` in `pageTitle.ts`.
- Right: onboarding warning link (amber pill, icon-only below `sm`),
  notifications trigger (32px) and popover (`w-80`, `rounded-lg`, `shadow-lg`,
  `shell-popover`).
- Notifications popover: `role="dialog"`, focus moves to "manage" link, outside
  pointer and Escape close, Escape restores trigger focus.

Breadcrumb rules: max three levels; always include the parent section for detail
routes. Every `/settings/*` page shows `Settings > current` (or a more specific
parent for currency/formats/limits); accounting, setup and bank-import detail
routes use their section parent. Do not repeat the page `<h1>` inside the content
when the navbar already shows it (settings pages are the exception — they render
an intro block).

## 4. Tabs and in-page navigation

Two mechanisms only:

1. **Route tabs** — `NavLink` lists in the sidebar (workspace/settings/accounting).
   Active state: `bg-gray-100`/accent tint, `font-medium`, `aria-current="page"`.
2. **View segments** — `SegmentedControl` (`role="tablist"` when `tabs`), for
   filtering a single route (income/expense, list/board). Not for navigation.

Do not add a third tab style. Settings sub-tabs use the same segmented component
or the settings sidebar, never a hand-built underline tab bar.

## 5. Breakpoints and responsive contract

| Range | Shell | Tables | Forms | Dialogs |
| --- | --- | --- | --- | --- |
| `< 640` | Mobile rail + menu button | Mobile columns only, stacked cards | Single column, stacked actions | Full-height drawer; ≥44px buttons |
| `640–767` | Mobile rail | Mobile columns | Single column, wider gutters (`px-7`) | Drawer |
| `768–1023` | Desktop rail, collapsible | Desktop columns, horizontal scroll if needed | 2-column allowed | Centered dialog |
| `1024–1279` | Desktop rail | Desktop | 2–3 columns | Centered, fixed size |
| `≥1280` | Desktop | Desktop | Multi-column | Centered, max width |

Exact user-visible breakpoint for the shell is **768px** (`md`). It is duplicated
in CSS (`md:ml-[…]`) and JS (`matchMedia("(min-width: 768px)")`); change both
together or extract a constant.

## 6. Responsive rules for components

- **Tables:** `DataTable` drops non-`mobile` columns below `md`; rows become
  taller; footer buttons 40px; selection bar becomes a compact card.
- **Toolbars:** `flex-wrap`, first child `flex: 1 1 320px; min-width: 0`; filter
  row collapses behind a toggle (`settings-filters-toggle`).
- **Settings rows:** `flex-wrap`, label takes `flex: 1 1 100%`, values wrap with
  `overflow-wrap:anywhere`, action buttons keep 40px height.
- **Dialogs:** `FloatingDialog` becomes a near-full-height sheet
  (`max-h: calc(100dvh - 3rem)`), footer buttons `min-h-11`.
- **Side panels:** `w: min(640px, 100vw)`, full `100dvh`.
- **Popovers:** anchored panels flip above/below; mobile variant is bottom-sheet
  style (`inset-x-3 bottom-3`).
- **Charts:** stack cards; never allow horizontal page scroll — charts shrink or
  scroll inside their card.

## 7. Safe areas and viewport

- Use `100dvh`, not `100vh`, for shell and drawers.
- Bottom actions respect `env(safe-area-inset-bottom)` (dialog footer includes
  `pb-[max(.75rem,env(safe-area-inset-bottom))]`).
- Snackbar/ConfirmToast anchor to `max(1rem, env(safe-area-inset-*))`.

## 8. Navigation findings

| ID | Severity | Issue | Resolution |
| --- | --- | --- | --- |
| DS-030 | High | ✅ Fixed in Phase 3 — settings/accounting use `SidebarFrame position="section"` | — |
| DS-031 | High | ✅ Fixed in Phase 1 — focus outlines come from `src/index.css`; shell/sidebar overrides removed | — |
| DS-032 | Medium | ✅ Fixed in Phase 3 — documented hierarchy; million-level values removed; popovers 10050/10060, modals 10030, feedback 15000 | — |
| DS-033 | Medium | ✅ Fixed in Phase 3 — Settings parent added; detail-route rules verified | — |
| DS-034 | Medium | ✅ Fixed in Phase 3 — 44px mobile targets for menu, bell, rail, toast, table actions | — |
| DS-035 | Low | ✅ Fixed in Phase 3 — full-bleed `/cashflow` and `/settled` documented | — |

## 9. Provisional decisions

- **No bottom mobile navigation.** The hamburger + rail is the only navigation
  pattern; do not add a tab bar without a product decision.
- **Collapsed rails** use `SidebarTooltip` for every icon-only control. Do not
  fall back to native `title`; keep the control's localized `aria-label`.
- **Accounting section navigation** keeps rows visible but disables/locks them
  until the corresponding setup phase is available. The Review guide and AI
  setup guide open in side panels from Overview (and AI setup also from the
  chart page); neither is listed as a sidebar row.
- **Desktop rail collapse persistence** is stored per mode; whether Personal
  shares the same keys needs verification.
- **Navbar page icon** (`PanelsTopLeft`) is decorative and hidden below `sm`;
  its removal would not affect navigation semantics.

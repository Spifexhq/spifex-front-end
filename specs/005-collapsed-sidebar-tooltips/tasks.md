# Tasks: Collapsed Sidebar Tooltips

**Input**: Design documents from `specs/005-collapsed-sidebar-tooltips/`

## Phase 1: Shared primitive

- [x] T001 Create `src/shared/ui/SidebarTooltip/index.tsx` with hover/focus, portal, side-aware clamping, arrow, Escape and reduced-motion support.
- [x] T002 Add tooltip enter motion to `src/shared/layout/Sidebar/sidebar-motion.css`.

## Phase 2: Rails

- [x] T003 Apply tooltips to Business workspace `SidebarNavigation` (nav, actions, settings footer).
- [x] T004 Apply tooltips to Business Settings `SidebarSettings.desktop` (nav and back).
- [x] T005 Apply tooltips to Accounting `AccountingSidebar` (nav, settings, back).
- [x] T006 Apply tooltips to Personal `PersonalLayout` (nav, actions, settings).
- [x] T007 Apply tooltips to Personal settings `PersonalSettingsSidebar` (nav and back).
- [x] T008 Apply tooltips to shared `WorkspaceSwitcher` (compact) and `SidebarUserConfiguration` (collapsed).
- [x] T009 Apply a collapsed-only tooltip to the `SidebarFrame` toggle button.
- [x] T010 Remove native `title` fallbacks from covered controls and add missing localized `aria-label`s.

## Phase 3: Verification

- [x] T011 Run `npm run lint`.
- [x] T012 Run `npm run build`.
- [x] T013 Visual check at 768px and 1440px for all rails; hover/focus/Escape and reduced motion.
- [x] T014 Add design-system evidence and `convergence.md`.

## Dependencies

- T001 blocks all rail tasks.
- T003–T009 can run in parallel after T001.
- T010 follows the rail edits.
- T011–T013 follow implementation.

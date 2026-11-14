# Implementation Plan: Collapsed Sidebar Tooltips

**Branch**: `005-collapsed-sidebar-tooltips` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

## Summary

Add a shared `SidebarTooltip` that wraps any collapsed rail control, anchors a compact dark tooltip to the actual control box, and clamps/flips in the viewport. Apply it to all Business, Settings, Accounting and Personal rails while removing their native `title` attributes.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18
**Primary Dependencies**: React portals, react-i18next, Tailwind CSS 4
**Testing**: `npm run lint`, `npm run build`, visual hover/focus checks
**Constraints**: No route/API/permission changes; reuse `tooltipPosition`, z-index 10050 and design motion rules
**Scale/Scope**: Shared sidebar primitive plus 5 rail implementations and shared workspace/user-menu controls

## Constitution Check

- Product boundaries: PASS — shared primitive, product-specific labels passed in.
- Stable API/routes: PASS — display-only change.
- Workspace context: PASS — no data access changes.
- Design system: PASS — dark tooltip matches `InfoTooltip` surface, uses existing layer and ally rules.
- Verification: PASS — build/lint and responsive checks planned.

## Project Structure

```text
src/shared/ui/SidebarTooltip/index.tsx        # shared collapsed-rail tooltip
src/shared/layout/Sidebar/sidebar-motion.css  # tooltip enter motion
src/products/business/components/Sidebar/SidebarNavigation.tsx
src/products/business/components/SettingsSidebar/SidebarSettings.desktop.tsx
src/products/business/pages/Accounting/components/AccountingSidebar.tsx
src/products/personal/layouts/PersonalLayout.tsx
src/products/personal/components/PersonalSettingsSidebar.tsx
src/features/workspaces/components/WorkspaceSwitcher.tsx
src/shared/layout/Sidebar/SidebarUserConfiguration.tsx
src/shared/layout/Sidebar/SidebarFrame.tsx
```

## Design decisions

1. **One primitive.** `SidebarTooltip` owns hover/focus state, positioning, portal, arrow, animation and Escape handling.
2. **Styling.** Compact dark pill (`bg-gray-900`, white text, `rounded-md`), small arrow facing the rail, subtle shadow, `z-[10050]`.
3. **Positioning.** Anchor to the inner interactive element, gap 10px from the rail, clamp vertically, flip left when right space is insufficient.
4. **Collapsed only.** Callers pass their existing `collapsed`/`railCollapsed` boolean; expanded and mobile states render no tooltip and no native `title`.
5. **Keyboard access.** Wrapper focus handlers open the tooltip; `aria-label` stays on the control so the label is announced regardless of tooltip visibility.

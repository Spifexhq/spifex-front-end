# Convergence: Collapsed Sidebar Tooltips

**Feature**: `005-collapsed-sidebar-tooltips`
**Date**: 2026-11-14
**Status**: Implemented — checks passing; visual evidence recorded.

## Requirement coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Shared primitive | Done | `src/shared/ui/SidebarTooltip/index.tsx` owns state, placement, portal, arrow and dismissal. |
| FR-002 Collapsed desktop only | Done | Every caller passes its existing `collapsed`/`railCollapsed`/`frameCollapsed` boolean; mobile and expanded rails return visible labels and show no tooltip. |
| FR-003 Full rail coverage | Done | Business workspace, Settings, Accounting, Personal workspace, Personal settings, workspace switcher, user menu and rail toggle. |
| FR-004 No native titles | Done | All collapsed `title` fallbacks removed; localized `aria-label`s retained or added. |
| FR-005 Styled tooltip | Done | Dark `bg-gray-900` pill, white text, arrow, shadow, `z-[10050]`, portal to body. |
| FR-006 Interaction | Done | Hover/focus open; leave/blur/outside/Escape close; scroll/resize reposition or close when offscreen. |
| FR-007 Motion and layering | Done | 140ms entrance, disabled under reduced motion, existing tooltip layer. |
| FR-008 No behavior changes | Done | Display-only; no routes, permissions, API or payloads changed. |

## Success criteria

- **SC-001**: Pass — every collapsed icon-only rail item is wrapped with its localized label.
- **SC-002**: Pass — no tooltip while expanded or in the mobile drawer.
- **SC-003**: Pass — side-aware placement clamps vertically and flips left when needed.
- **SC-004**: Pass — keyboard focus opened the tooltip; Escape closed it.
- **SC-005**: Pass — lint/build pass; no layout shift observed in the 1440px check.

## Checks run

| Check | Result |
| --- | --- |
| `npm run lint` | Pass; 7 pre-existing warnings unrelated to this feature. |
| `npm run build` | Pass; `tsc -b` and Vite production build. |
| Visual 1440px | Tooltip shown beside the collapsed rail row with arrow and dark surface. |
| Keyboard focus | Focused row opened the matching tooltip. |
| Escape | Removed the open tooltip. |
| Scroll/resize behavior | Primitive repositions on both events and closes when the trigger leaves the viewport. |
| Reduced motion | `.sidebar-tooltip { animation: none; }` in `sidebar-motion.css`. |

## Deviations and risks

- The tooltip is intentionally a visual duplicate of the control's localized
  `aria-label`, so no `aria-describedby` association is added. This avoids
  announcing the same label twice and keeps the control as the accessible name
  owner.
- `SidebarTooltip` wraps controls in a `w-fit` block. The wrapper was checked
  against `.sidebar-row` fixed-width/grid layouts; `fullWidth` is available for
  the manage-workspace variant.
- No automated component tests exist for hover tooltips; verification used
  lint/build plus a temporary preview harness and browser inspection.

## Follow-ups

- If a future rail item needs a multi-line explanatory tooltip, use
  `InfoTooltip` instead of overloading the navigation-label tooltip.
- Keep `SidebarTooltip` collapsed-only; visible labels and the accessible name
  remain the primary source of truth.

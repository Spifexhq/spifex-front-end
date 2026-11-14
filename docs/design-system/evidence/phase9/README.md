# Phase 9 — Collapsed sidebar tooltips

**Date**: 2026-11-14
**Feature**: `specs/005-collapsed-sidebar-tooltips`

## Scope

Collapsed desktop rails previously relied on native `title` attributes. They are
now backed by a shared, styled tooltip that appears on hover and keyboard focus.

## Changes

- Added `SidebarTooltip` (`src/shared/ui/SidebarTooltip`) with:
  - Portal placement in `document.body`.
  - Dark compact surface, arrow, subtle shadow and `z-[10050]`.
  - Right-side anchor with left-side flip when space runs out.
  - Vertical viewport clamping and re-positioning on scroll/resize.
  - Hover and keyboard focus open; leave, blur, outside pointer and Escape close.
  - Reduced-motion safe entrance.
- Applied to:
  - Business workspace rail: nav, finance actions, settings footer.
  - Business Settings rail: nav and back-to-workspace.
  - Accounting rail: nav, settings and back-to-workspace.
  - Personal workspace rail: nav, finance actions, settings footer.
  - Personal settings rail: nav and back-to-workspace.
  - Shared workspace switcher when compact.
  - Shared user menu trigger when collapsed.
  - Shared rail toggle button when collapsed.
- Removed native `title` fallbacks from those controls and added missing
  localized `aria-label`s.

## Verification

| Check | Result |
| --- | --- |
| Visual at 1440px | Tooltip appears beside the collapsed row, vertically centered, with a visible arrow. |
| Tooltip size | `Overview` measured ~74×32px at the rail edge. |
| Keyboard focus | Focusing a collapsed row opens the matching tooltip. |
| Escape | Pressing Escape removes the tooltip. |
| Reduced motion | `.sidebar-tooltip` animation is disabled by `prefers-reduced-motion`. |
| Expanded/mobile | The tooltip is gated by each rail's existing `collapsed`/`railCollapsed` flag; mobile and expanded labels stay visible. |
| `npm run lint` | 0 errors; 7 pre-existing warnings. |
| `npm run build` | Passed (`tsc -b` + Vite). |

## Screenshot

`sidebar-tooltip-1440.png` shows the collapsed rail and the styled `Overview`
tooltip. The screenshot was captured with headless Chrome against a temporary
preview harness; the harness was removed after verification.

## Accessibility note

The tooltip is a visual duplicate of the control's localized `aria-label`; it
does not carry essential information. The control remains the accessible name
owner, so a separate `aria-describedby` association is intentionally not added.

# Research: Collapsed Sidebar Tooltips

**Feature**: `005-collapsed-sidebar-tooltips`
**Date**: 2026-11-14

## Current behavior

- Collapsed rails hide `.sidebar-label` with opacity and render no visible label.
- Several controls use the native `title` attribute as a fallback tooltip. Native titles are delayed, cannot be styled, are unavailable on touch, and look out of place.
- Rails share `SidebarFrame`, but their row markup differs:
  - Business workspace: flex-ish `sidebar-row` links/buttons.
  - Business Settings: `.sidebar-row` nav links.
  - Accounting: fixed 36/48px grid rows with `ml-1.5`.
  - Personal workspace/settings: `.sidebar-row` links/buttons.
- `InfoTooltip` already provides portal positioning behavior, but it owns an info icon trigger and is not suitable for wrapping navigation rows.

## Decisions

- Add `SidebarTooltip` under `src/shared/ui/SidebarTooltip`.
- Wrap the control in a `w-fit` block wrapper so hover/trigger bounds match the visible row.
- Anchor to the inner `a`/`button` via `getBoundingClientRect`, not the wrapper, so the tooltip aligns with the icon row.
- Use `tooltipPosition` only for general clamping? It centers above/below; sidebar tooltips need side placement, so implement a small side-aware clamp helper inside the primitive while reusing the same edge/gap constants.
- Surface: dark `bg-gray-900` pill with white 12px text, `rounded-md`, arrow, shadow, `z-[10050]`.
- Open on mouse enter and focus; close on leave/blur with 120ms delay, click, Escape, scroll and resize.
- No native `title` on covered rows. Existing `aria-label` values provide the accessible name.

## Rejected alternatives

- **CSS-only tooltips using `group-hover`:** cannot clamp/flip at viewport edges and would be clipped by the rail's `overflow-x: clip`.
- **Reuse `InfoTooltip`:** its trigger is an info icon and its placement is above/below, not beside a rail.
- **Keep native `title`:** fails the styled requirement and has inconsistent timing/accessibility.
- **A separate tooltip per rail:** duplicates positioning and styling logic.

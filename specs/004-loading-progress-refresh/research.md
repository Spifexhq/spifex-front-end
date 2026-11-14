# Research: Loading Progress Refresh

**Feature**: `004-loading-progress-refresh`
**Date**: 2026-11-14

## Current behavior

- `TopProgress` top variant is `position: fixed; top: 64px; z-[9999]` and spans the full viewport width.
- It is rendered inside pages but escapes the content scroll area because it is fixed.
- It crosses the sidebar at the 64px line and can paint over sticky page controls.
- Its animation is a 50%-width solid accent block translating from -60% to 110%.
- The center variant is a 10vw bar with a shadow, no label, and the same solid translation.
- `SkeletonLine` uses `animate-pulse`, which reads as opacity blinking rather than a directional shimmer.
- `TopProgress` injects a `<style>` block per instance and ignores the existing motion tokens.

## Design-system constraints

- Motion tokens: 120/150/180/220ms; layout curve `cubic-bezier(.22,1,.36,1)`.
- Layering tokens: navbar 30, sidebar 40, modal 10030, popover 10060, toast 15000.
- Accent: `--accentPrimary`, `--accentPrimaryHover`; no new accent hues or arbitrary hex values.
- Reduced motion is mandatory for every animation.
- Loading hierarchy: route-level progress, page skeleton, table skeleton, region busy, action spinner.

## Alternatives considered

1. **Keep fixed and offset with sidebar width.** Rejected: requires coupling to shell context and still crosses floating layers.
2. **Put the bar at `top: 0` above the navbar.** Rejected: hides navigation chrome and matches the reported overlap problem.
3. **Use a global portal overlay.** Rejected: same stacking risk and does not benefit from content-column width.
4. **Use a spinner instead of a bar.** Rejected: the product already has `Spinner` for actions; the route-level signal should remain a bar.
5. **Add a third-party progress library.** Rejected: the current behavior is small, and a dependency would duplicate the design system.

## Decision

- Top bar: sticky at `top: 0` inside the content scroll area with `margin-bottom: -height`.
- Stacking: `z-20`, below navbar/sidebar/modals/popovers/toasts.
- Motion: one accent gradient sweep on a neutral track; static segment under reduced motion.
- Center state: minimal centered line with a localized accessible label; no visible words, borders or shadows.
- SkeletonLine: existing `shimmer` keyframe over a neutral line; static under reduced motion.
- Remove `topOffset`: sticky positioning makes the hard-coded 64px offset obsolete.

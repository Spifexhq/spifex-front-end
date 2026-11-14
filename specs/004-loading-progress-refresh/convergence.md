# Convergence: Loading Progress Refresh

**Feature**: `004-loading-progress-refresh`
**Date**: 2026-11-14
**Status**: Implemented — checks passing; visual evidence recorded.

## Requirement coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Sticky in-flow top bar | Done | `TopProgress` uses `sticky top-0` with `marginBottom: -height`; measured at `top: 64` after a 420px scroll. |
| FR-002 Below shell/floating layers | Done | Bar `z-20`; popover `z-10060`, modal `z-10030`, toast `z-15000`; bar starts at the content edge (`left: 248`). |
| FR-003 Minimal accent sweep | Done | Single `tprog-sweep` gradient on a neutral track; no secondary shine, words, borders or shadows. Uses `--accentPrimary`/`--accentPrimaryHover`. |
| FR-004 Fade and reduced motion | Done | 150ms opacity transition; reduced-motion rules in `index.css`. |
| FR-005 Center line | Done | Minimal centered 112×4px line with a localized accessible label and no visible text, border or shadow. |
| FR-006 Skeleton shimmer | Done | `SkeletonLine` uses `shimmer` at 1.6s; static under reduced motion. |
| FR-007 Remove `topOffset` | Done | 31 call-site usages removed; no `topOffset` references remain. |
| FR-008 Localized progressbar label | Done | `role="progressbar"`, `aria-label` from `common:loading`, `aria-hidden` when inactive. |
| FR-009 No behavior/API changes | Done | No routes, permissions, payloads or copy changed. |

## Success criteria

- **SC-001**: Pass — bar constrained to content column; floating layers above it.
- **SC-002**: Pass — sticky bar remained at the content top while scrolling.
- **SC-003**: Pass — top and center variants use the same minimal sweep; reduced-motion path is static.
- **SC-004**: Pass — page and table skeletons share the shimmer.
- **SC-005**: Pass — lint/build pass; 360/1440 checks show no overflow or layout shift.

## Checks run

| Check | Result |
| --- | --- |
| `npm run lint` | Pass; 7 pre-existing warnings unrelated to this feature. |
| `npm run build` | Pass; `tsc -b` and Vite production build. |
| 1440px visual | Top bar and skeleton shimmer captured; bar begins at content edge. |
| 360px visual | Bar spans content width; no horizontal overflow. |
| Scrolled state | `position: sticky`, `top: 64px` after 420px scroll. |
| Stacking | Computed bar `z-index: 20` versus popover `10060`. |
| Reduced motion | CSS media query disables both progress animations and hides the skeleton shine. |

## Deviations and risks

- The top bar is intentionally anchored to the page content, not the viewport. On
  a Settings page at scroll top it appears below the layout heading; after
  scrolling it sticks to the content top. This prevents the reported overlap.
- Headless screenshots cannot show motion; animation names/durations and the
  reduced-motion CSS were verified separately.
- The top bar remains a 2px decorative indicator with a localized accessible
  label; it does not expose determinate progress because the app does not track
  request completion percentage. No loading words are shown visually.
- Lint warnings are pre-existing and unrelated to this change.

## Follow-ups

- If a determinate route progress value is introduced later, add it as
  `aria-valuenow` without changing the visual track contract.
- Keep first-load progress bars suppressed when a page skeleton is present.

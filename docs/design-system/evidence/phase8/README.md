# Phase 8 — Loading progress refresh

**Date**: 2026-11-14
**Feature**: `specs/004-loading-progress-refresh`

## Scope

The top progress indicator was crossing the sidebar and floating above content
because it was fixed to the viewport at `top: 64px` with `z-[9999]`. The bar and
skeleton motion were also visually flat.

## Changes

- `TopProgress` top variant is now a **sticky content bar** (`z-20`) with
  `margin-bottom: -height`, so it paints at the top of the content scroll area
  without shifting layout.
- The bar uses one soft accent gradient sweep on a neutral track. It has no
  secondary shine, visible words, borders or shadows. Reduced motion shows a
  static accent segment.
- The center variant is now a minimal centered line with a localized accessible
  label and the same sweep. Nothing is written on screen.
- `SkeletonLine` now uses the shared `shimmer` keyframe instead of
  `animate-pulse`; it stays static under reduced motion.
- First-load `TopProgress` bars were removed where a page skeleton already
  communicates the same wait. Top bars now remain for background sync, saves
  and report refreshes.
- The obsolete `topOffset` prop and all 31 call-site usages were removed.
- `SubscriptionCanceled` no longer renders an invisible progress bar.

## Verification

| Check | Result |
| --- | --- |
| Bar starts at content edge | At a 1000px viewport with a 248px sidebar, the bar measured `left: 248`, `width: 746`; it did not cross the sidebar. |
| Sticky while scrolling | After setting the content scroll to 420px, the bar stayed at `top: 64` with `height: 2`. |
| Stacking order | Bar `z-index: 20`; popover `z-index: 10060`; modal and toast layers remain above it. |
| Mobile width | At 360px, the bar spanned the 354px content width (6px scrollbar) with `scrollWidth: 360`; no horizontal overflow. |
| Animation | Single sweep `tprog-sweep` at 1.4s; skeleton shine `shimmer` at 1.6s. |
| Reduced motion | `.tprog-sweep` stops and shows a static 35% segment; skeleton shine is hidden. |
| `npm run lint` | 0 errors; 7 pre-existing warnings. |
| `npm run build` | Passed (`tsc -b` + Vite). |

## Screenshots

| File | View |
| --- | --- |
| `top-progress-1440.png` | Sticky accent line starts at the content edge, below the navbar; popover remains above it. |
| `top-progress-360.png` | Full-width mobile bar below the header; no horizontal overflow. |
| `center-progress-1440.png` | Minimal centered line with no visible text, border or shadow. |
| `skeleton-shimmer-1440.png` | Skeleton lines with the new shimmer sweep. |

The screenshots were captured with headless Chrome against a temporary preview
harness; the harness was removed after verification.

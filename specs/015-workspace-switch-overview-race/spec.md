# Bug fix: Overview blank after workspace switch

**Feature Branch**: `015-workspace-switch-overview-race`
**Created**: 2026-11-17
**Status**: Implemented

## Problem

Switching workspaces sometimes leaves the Business overview blank until a full
reload. The console shows a transient `401` and SVG attribute errors containing
`undefined`.

## Root cause

Auth and LiveSync refresh flows can invalidate the HTTP cache immediately after
a workspace switch. The previous in-flight guard treated a cache-generation
change as an identity change and cancelled the new workspace's overview GET.
The overview effect treated that cancellation as a finished request and did not
retry, leaving no data and no visible error.

Charts also rendered with empty or malformed series points during the
transition, which produced `d`, `cx` and `cy` attribute errors.

## Requirements

- **FR-001**: A same-identity cache invalidation must not cancel an in-flight
  read.
- **FR-002**: A real user/workspace change still cancels superseded reads.
- **FR-003**: The overview retries a bounded number of times after a
  cancellation.
- **FR-004**: Overview arrays and chart point values are normalized before
  rendering.
- **FR-005**: Empty or invalid chart series do not render broken SVG geometry.

## Acceptance

1. Switch workspaces repeatedly; the overview loads without a manual reload.
2. The old workspace's reads are discarded after the switch.
3. Charts render normally for non-empty and empty workspaces.
4. No `Expected moveto path command` or undefined `cx`/`cy` warnings occur from
   the overview charts.

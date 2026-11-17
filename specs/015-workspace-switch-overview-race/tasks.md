# Tasks: Overview blank after workspace switch

**Feature**: `015-workspace-switch-overview-race`

- [x] Identify the stale-cancellation path in `request()`.
- [x] Separate identity cancellation from cache invalidation.
- [x] Raise the auth-gate wait window.
- [x] Add bounded overview retries for cancelled reads.
- [x] Normalize overview response arrays.
- [x] Harden chart points and Sparkline values.
- [x] Guard empty chart series.
- [x] Run TypeScript, ESLint and production build.

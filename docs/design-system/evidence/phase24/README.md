# Phase 24 — Bank imports design-system pass

**Date**: 2026-11-16
**Feature**: `022-bank-imports-no-document-storage`

## What changed

- Bank imports now uses the shared `Card` surface for the history toolbar,
  review summary, filters and table frame.
- Review counts use `MetricCard`; statuses use the shared `Badge`; error and
  notice states use `ErrorState`; bulk row actions use `SelectionBar`.
- The page header follows the standard `text-2xl` title, muted description and
  primary page action pattern.
- The transaction review drawer keeps the shared `SidePanel` opening and closing
  animation. It stays mounted with an `isOpen` prop instead of being removed
  immediately, so `AnimatePresence` can run the exit transition.
- The drawer's discard confirmation is mounted only while it is open, keeping
  the form interactive at all other times.
- The review amount uses the shared `Input kind="amount"` control, which renders
  `AmountField` with workspace currency formatting.

## Personal parity

- Personal workspaces now render the same flow at `/personal/imports` and
  `/personal/imports/:statementId`, with an "Import statement" sidebar entry.
- The shared `BankImports` component accepts `product`, `basePath`, permission
  and bank-loader props; Personal loads accounts through `allPersonal`.
- Personal review keeps the same design-system surfaces, drawer animation and
  compact selection bar, but hides entity, project, document type, department
  and inventory controls.

## Verification

| Check | Result |
| --- | --- |
| Frontend `tsc -b` | Pass |
| Frontend lint | 0 errors; existing warnings only |
| Frontend build | Pass |
| Django `check` | Pass |
| Migration check | No changes detected |

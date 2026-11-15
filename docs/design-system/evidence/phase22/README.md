# Phase 22 - Financial interaction fixes

**Date**: 2026-11-15
**Feature**: `spifex-back-end/specs/017-financial-interaction-fixes`

## Scope

- Selection bars hide while the settlement modal is open in Business and
  Personal; selection state is preserved.
- Cash-flow entry editing no longer crashes on `validate_changes`; the settled-field guard now receives the correct keyword arguments.
- Personal sidebar Receipts, Payments and Transfers open the create dialog in
  place without navigating to Cash Flow.
- Personal recurring transactions support bulk editing of selected siblings;
  the series list uses 10-row pages, status signals and per-row edit actions;
  recurrence setup, the "Apply these changes to" scope section and the series
  live in a separate Recurrence tab.
- Bank account deletion soft-deletes accounts with financial history and hides
  them from normal product queries.
- The Business cash-flow table no longer has an Accounting column; accounting
  readiness, mapping, policy, book and journal are shown in the entry preview,
  and settled entries keep the Bank column.

## Verification

| Check | Result |
| --- | --- |
| Django `check` | Pass |
| `makemigrations --check --dry-run` | No changes detected |
| Python compileall | Pass |
| Frontend `tsc -b` | Pass |
| Frontend lint | 0 errors; existing warnings only |
| Frontend build | Pass |
| Personal locale parity | Pass |
| Focused banking tests | Added; test runner blocked by pre-existing migration graph |

## Notes

- `SelectionBar` stays in the feedback stack at z-15000; callers now suppress it
  while a modal owns the action instead of lowering global z-index.
- Personal recurrence reuses the Business recurrence service and version checks.
- Soft-deleted banks are excluded by the default manager; `all_objects` remains
  for audit access.
- The existing test-database migration failure still prevents running the full
  backend suite.

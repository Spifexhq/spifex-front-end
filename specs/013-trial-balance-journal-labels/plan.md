# Implementation Plan: Trial balance and journal metric labels

**Branch**: `013-trial-balance-journal-labels` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Rebuild the Overview trial-balance table with a bordered surface, aligned totals and a balance badge, then rename the Journals metric cards to distinct labels.

## Technical Context

- Page: `src/products/business/pages/Accounting/pages/AccountingOverviewPage.tsx`.
- Labels: `accountingSettings` `overview.*` and `journalsPage.metrics.*`.
- Existing data: `TrialBalanceRow[]`, `JournalEntry[]`.

## Design Decisions

1. **Panel** — `Card tone="slate" radius="xl"` with a balanced badge beside the Open chart action.
2. **Table** — rounded border, slate header, account-code badges, row hover and right-aligned numeric columns.
3. **Totals** — four cells: Total, Debit, Credit, Balance; the Balance total is the difference.
4. **State** — emerald for balanced, rose for unbalanced; hide the badge when there are no rows.
5. **Journal metrics** — “Journals” for the journal count, “Entries” for the line count.

## Validation

- `tsc -b`, lint, build and accounting i18n.
- Balanced and unbalanced visual review.

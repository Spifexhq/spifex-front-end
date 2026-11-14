# Implementation Plan: Journal preview stack

**Branch**: `014-journal-preview-stack` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Replace the nested-scroll journal lines table with a fitting static table, add a controlled preview stack to the Journals page, and extend SidePanel/DialogShell with a stack-depth presentation.

## Technical Context

- Journals page: `src/products/business/pages/Accounting/pages/AccountingJournalsPage.tsx`.
- Drawer: `SidePanel` → `SidePanelFrame` → `DialogShell`.
- Related data: `api.getEntry(id)` and `api.getSettledEntriesBulk([id])`.
- Copy: `accountingSettings` journals preview keys and `financeEntries` labels.

## Design Decisions

1. **Table** — static `table-fixed` three-column table with account code/name, debit and credit totals. No inner `overflow-y`.
2. **Stack state** — `PreviewTarget[]` in the Journals page: initial journal, optional related settlement/entry.
3. **Stack visual** — `stackDepth` narrows the drawer by 14px per level and paints decorative page edges behind it.
4. **Close** — top preview pops one level; the initial journal closes the preview when it is the only item.
5. **Unrelated selection** — opening another journal replaces the stack.
6. **Edit** — edit drawers keep `stackDepth=0`.

## Validation

- `tsc -b`, lint, build and accounting i18n.
- Journal preview at desktop/mobile widths.

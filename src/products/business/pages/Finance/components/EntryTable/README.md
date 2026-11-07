# Finance entry tables

CashFlow/CashFlowTable and SettledEntries/SettledEntriesTable are page entry points. This folder owns their shared domain behavior; DataTable owns presentation, resizing, selection and virtualization.

- useEntries translates filters and consumes useCursorPager in accumulating mode.
- entryRows preserves settlement external IDs, sorts/deduplicates loaded rows, groups months using ISO dates, totals cents, and reads running balances from the server.
- EntryPreview uses the shared SidePanel. Cash entries load their detail endpoint; settlement identity stays distinct from its underlying entry. Accounting and reference lookups settle before fields appear, with recoverable failures and no intermediate identifier flash.
- AccountingIndicator is the only accounting-color legend. Full accounting explanations are in EntryPreview.
- SelectionToolbar owns the floating summary and confirmed delete/undo operations. Settlement creation remains in the existing page workflow; callbacks refresh bank balances and KPIs.

All interface labels live in financeEntries.json in English, Portuguese, French and German. Accounting invariants and posted-history restrictions remain enforced by the existing APIs.

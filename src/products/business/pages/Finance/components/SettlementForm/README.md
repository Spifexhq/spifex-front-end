# Shared settlement preparation

The batch settlement experience and draft helpers live in `src/shared/financial/settlements` and are reused by Enterprise and Personal Finance. The existing Enterprise import path remains as a compatibility re-export. `FloatingDialog` supplies the shared portal, fixed frame, animation, scrolling, focus and pinned footer.

Prepare supports 20-row pages, search, issue/type/unassigned filters, per-entry bank/date/amount, Shift selection, select-all-matching, bulk bank/date assignment, partial percentages, full-balance reset, removal and undo. Checkboxes choose the bulk-edit targets. Confirmation always settles every remaining listed entry; filters never silently exclude payments. Review groups incoming, outgoing and net amounts by bank/currency. Touch targets expand on narrow screens. Partial amounts validate and calculate in integer cents.

Drafts load fresh lightweight entry projections in batches of 100 from GET `cashflow/entries/settlement-drafts/`. Only IDs, description, due date, original/open amounts, direction and opaque version are returned, without ledger readiness or related objects. There is no fallback to a table's original amount. Missing/stale entries produce a recoverable load error.

The shared atomic bulk settlement API receives one bank and value date per entry plus an expected version. The service locks rows in stable primary-key order, checks versions before posting and rejects stale drafts. Personal workspaces use the same service and currency/ownership rules while skipping Enterprise ledger posting. The complete atomic transaction rolls back bank balances, settlements and journals on failure.

No automatic retries are made. Drafts remain after submission failure; reloading balances preserves assignments and entered amounts, so the user must review any differences. An interrupted connection can have an uncertain outcome: guidance instructs checking current payments before repeating. A fresh version check blocks resubmission of an old draft; it does not replace a general durable idempotency protocol.

No new migration is required. Existing API consumers remain compatible through the Enterprise import path.

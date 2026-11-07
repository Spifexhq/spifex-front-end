# Settlement preparation

Finance owns this form; FloatingDialog supplies the shared portal, fixed frame, animation, scrolling, focus and pinned footer. The old components/Modal/SettlementModal.tsx implementation is removed.

Prepare supports 20-row pages, search, issue/type/unassigned filters, per-entry bank/date/amount, Shift selection, select-all-matching, bulk bank/date assignment, partial percentages, full-balance reset, removal and undo. Checkboxes choose the bulk-edit targets. Confirmation always settles every remaining listed entry; filters never silently exclude payments. Review groups incoming, outgoing and net amounts by bank/currency. Touch targets expand on narrow screens. Partial amounts validate and calculate in integer cents.

Drafts load fresh lightweight entry projections in batches of 100 from GET cashflow/entries/settlement-drafts/. Only IDs, description, due date, original/open amounts, direction and opaque version are returned, without ledger readiness or related objects. There is no fallback to a table's original amount. Missing/stale entries produce a recoverable load error.

The existing atomic bulk settlement API receives one bank and value date per entry plus optional expected_version. All entries and banks lock in stable primary-key order; versions are checked before any posting. A stale or repeated partial draft returns 412. Deleted entries, inactive banks, amounts above the open balance and existing fiscal/currency/posting constraints reject the operation. The complete atomic transaction rolls back bank balances, settlements and journals on failure. Settlement timestamps now default at call time, fixing the former import-time default.

No automatic retries are made. Drafts remain after submission failure; reloading balances preserves assignments and entered amounts, so the user must review any differences. An interrupted connection can have an uncertain outcome: guidance instructs checking current payments before repeating. A fresh version check blocks resubmission of an old draft; it does not replace a general durable idempotency protocol.

Deploy backend before frontend for the projection route and expected_version enforcement. No new migration. Existing API consumers can omit expected_version for compatibility.

Validation: 109 frontend regressions pass, TypeScript/scoped lint and production build pass. Backend Finance/ledger tests evaluate 75 cases (73 pass; 2 PostgreSQL-only concurrency tests skipped on SQLite). The runner uses a disposable current-schema database. Simultaneous PostgreSQL lock stress and browser-based visual testing remain outside local verification.

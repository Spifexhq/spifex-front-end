# Implementation Plan: Accounting journals and filters

**Branch**: `009-accounting-journals-and-filters` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Fix journal ordering and independent overview loading, add a compact journal display ID, and rebuild the shared Accounting record filter toolbar on the Settings filter pattern.

## Technical Context

- Backend: DRF `JournalEntryViewSet` with `DefaultCursorPagination`.
- Frontend: Overview, Journals, `useRecordFilters`, shared Settings filter components.
- IDs: `JournalEntry.entry_number` (often blank) and `JournalEntry.id` (ULID external ID).
- No schema or payload-shape changes.

## Design Decisions

1. **Ordering** — the direct journals viewset declares `ordering = ("-posting_date", "-id")`; cursor pagination reads view ordering.
2. **Overview loading** — `Promise.allSettled` sets trial and journal data independently; an error is shown if either fails.
3. **Display ID** — `journalDisplayId` prefers `entry_number`; otherwise derives `JE-YYYYMMDD-XXXX` from `posting_date` and the last four alphanumeric characters of the journal identifier.
4. **Use sites** — Journals entry column and detail header, Overview recent journals, and entry preview linked journal.
5. **Filters** — `useRecordFilters` renders inside `SettingsSurface`; uses `SettingsFilters`, `SettingsFilter`, `SettingsClearFilters` and Settings popovers anchored to each chip.
6. **Behaviour** — search applies on submit; each chip applies/clears its own key; clear-all clears search, drafts and applied filters.
7. **Scope** — all Accounting pages using `useRecordFilters` inherit the filter design.

## Validation

- Frontend `tsc -b`, lint, build and accounting i18n.
- Backend `manage.py check`, migration check and AI-guide tests.
- Cursor ordering verified with `DefaultCursorPagination.get_ordering`.

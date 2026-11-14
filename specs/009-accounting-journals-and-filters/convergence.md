# Convergence: Accounting journals and filters

**Feature**: `009-accounting-journals-and-filters`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Newest-first journal list | Done | `JournalEntryViewSet.ordering = ("-posting_date", "-id")`; cursor ordering verified. |
| FR-002 Independent Overview loads | Done | `Promise.allSettled` sets trial and journal data independently. |
| FR-003 Display ID helper | Done | `journalDisplayId` returns stored number or `JE-YYYYMMDD-XXXX`. |
| FR-004 Use display ID | Done | Journals column/detail, Overview recent journals and entry preview. |
| FR-005 Settings-style filters | Done | `useRecordFilters` uses `SettingsSurface`, chips and Settings popovers. |
| FR-006 Preserve filter behaviour | Done | Remote options, labels, dates, apply/clear and cursor paging retained. |
| FR-007 All Accounting pages | Done | Shared hook is used by Journals, Books, Bank connections, Posting policies and Periods. |
| FR-008 No permission/payload changes | Done | Existing endpoints and permissions reused. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |
| `npm run check:accounting-i18n` | 479 keys |
| Backend `manage.py check` | Pass |
| Backend `makemigrations --check --dry-run` | No changes |
| Backend AI-guide tests | 6 passed (`--keepdb`) |
| Cursor ordering | `('-posting_date', '-id')` |

## Notes and Risks

- Authenticated browser verification was unavailable; filter layout follows the
  existing Settings components and was reviewed statically and through the build.
- The display ID is a UI label. If the backend later populates `entry_number`,
  that value takes precedence automatically.
- A journal display suffix uses the last four alphanumeric characters of the
  identifier; collisions are unlikely but the stored number should become the
  long-term source of truth.

# Convergence: Accounting page actions

**Feature**: `012-accounting-page-actions`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 `+` on create buttons | Done | Plus icons on Books, Bank connections, Category rules, Periods, Manual journal and Add line. |
| FR-002 Create action in filter row | Done | `useRecordFilters` `actions` renders in `.settings-toolbar`. |
| FR-003 Remove page descriptions | Done | Removed from Books, Bank connections, Category rules, Periods, Journals, Chart and Overview. |
| FR-004 Chart actions with tabs | Done | SegmentedControl and Add/More share one flex row. |
| FR-005 Related setup icons | Done | Books, Category rules and Bank connections render icon-only beside the tabs. |
| FR-006 Orange Add account | Done | Add account uses the standard primary orange button. |
| FR-007 Chart filter style | Done | Chart filters use `SettingsSurface`, filter chips and Settings popovers. |
| FR-008 Contextual guidance/permissions | Done | Card and side-panel guidance retained; permission guards unchanged. |
| FR-009 No route/API changes | Done | UI composition only. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |
| `npm run check:accounting-i18n` | 474 keys |

## Notes

- The i18n key count decreased because page-description translations are no
  longer referenced.
- Authored page-level descriptions were removed; contextual setup help inside
  cards and side panels remains.

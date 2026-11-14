# Convergence: Filter popover standardization

**Feature**: `010-filter-popover-standardization`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Settings appearance | Done | All filter popovers use `appearance="settings"`. |
| FR-002 Remove top spacing | Done | Settings popover strips `.p-4` and first-child `mt-3`. |
| FR-003 Desktop focus | Done | `useDialogFocus` focuses the first editable field; select-only keeps panel focus. |
| FR-004 Mobile no auto-focus | Done | `skipMobile` focuses the panel at `max-width: 767px`. |
| FR-005 Placeholder consistency | Done | `#94a3b8` / 13px applied to input, textarea, date and select placeholders. |
| FR-006 No duplicate labels | Done | Accounting, Business Settings and Personal popovers use accessible names only. |
| FR-007 Search chip | Done | Accounting search is a `SettingsFilter` chip with a Settings popover. |
| FR-008 Design-system docs | Done | Filter-popover section and focus rules added. |
| FR-009 Clear does not refresh | Done | Popover Clear resets the draft only; Apply applies and refreshes. |
| FR-010 Apply label | Done | Filter apply actions now read **Apply**. |
| FR-011 No tips inside filters | Done | Removed bank/project type tips and member role/group hints from filter popovers. |
| FR-012 No permission/route/API changes | Done | Shared UI-only change. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |
| `npm run check:accounting-i18n` | 479 keys |

## Notes and Risks

- Focus behaviour is implemented once in the shared popover; custom popovers that
  bypass `appearance="settings"` will not inherit it.
- Placeholder styling is scoped to Settings popovers, leaving application-wide
  inputs unchanged.
- Authenticated visual verification was unavailable; behaviour was checked
  through the shared component and production build.

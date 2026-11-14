# Convergence: Landing-aligned primary button

**Feature**: `011-primary-button-landing-style`
**Date**: 2026-11-14

## Requirement Coverage

| Requirement | Status | Evidence |
| --- | --- | --- |
| FR-001 Strong-orange tokens | Done | Added `--accentPrimaryStrong*` to `src/index.css`. |
| FR-002 Keep accent tokens | Done | `--accentPrimary*` remains for selection/focus/links. |
| FR-003 Primary colours | Done | White text plus `#C2410C`/`#A93A0A`/`#92320A`/`#E8B6A1`; standard shape, typography, shadow and motion retained. |
| FR-004 Size scale unchanged | Done | `BUTTON_SIZES` untouched. |
| FR-005 Docs | Done | Updated tokens, colours and component standards. |
| FR-006 No behaviour changes | Done | Styling only. |

## Verification

| Check | Result |
| --- | --- |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 existing warnings |
| `npm run build` | Pass |

## Notes

- White on `#C2410C` is 5.18:1.
- The landing button's larger size was not copied because the app size scale is
  shared by every variant; only the primary visual treatment changed.

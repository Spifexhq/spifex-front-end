# Phase 16 — Landing-aligned primary button

**Date**: 2026-11-14
**Feature**: `spifex-front-end/specs/011-primary-button-landing-style`

## Scope

- Added strong-orange action tokens matching `spifex-landing`:
  - fill `#C2410C`
  - hover `#A93A0A`
  - pressed `#92320A`
  - disabled `#E8B6A1`
- Updated only the `Button primary` colours:
  - white text
  - landing fill, hover, pressed and disabled tokens
  - standard button radius, font weight, shadow and transition retained
- Kept `--accentPrimary*` for selection, links, focus and switches.
- Kept the app size scale to avoid global layout shifts.
- Updated design-system token, colour and component documentation.

## Verification

| Check | Result |
| --- | --- |
| `tsc -b` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |

## Notes

White on `#C2410C` has a 5.18:1 contrast ratio.

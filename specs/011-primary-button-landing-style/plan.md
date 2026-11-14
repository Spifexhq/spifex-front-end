# Implementation Plan: Landing-aligned primary button

**Branch**: `011-primary-button-landing-style` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Add strong-orange action tokens mirroring `spifex-landing` and point only the `Button` primary variant at them.

## Technical Context

- Landing source: `spifex-landing/src/components/ui/Button.tsx`, `src/app/globals.css`.
- App source: `src/index.css` tokens and `src/shared/ui/Button/sizes.ts`.
- Existing `--accentPrimary` remains for selection/focus/links.

## Design Decisions

1. **Tokens** — add `--accentPrimaryStrong` `#C2410C`, hover `#A93A0A`, pressed `#92320A`, disabled `#E8B6A1`.
2. **Variant** — primary uses white text and the landing fill/hover/pressed/disabled colours only. The standard button radius, font weight, transition and no-shadow treatment remain.
3. **Sizes** — keep the app size scale to avoid global layout regressions.
4. **Scope** — only `primary` changes; all other variants remain.
5. **Docs** — update token, colour and component standards.

## Validation

- `tsc -b`, lint, build.
- Visual token comparison with the landing primary button.

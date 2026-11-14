# Implementation Plan: Filter popover standardization

**Branch**: `010-filter-popover-standardization` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Standardize filter popovers at the shared layer so every existing caller inherits consistent spacing, focus and placeholder styling, then fix duplicated internal labels across Accounting, Business Settings and Personal.

## Technical Context

- Shared popover: `src/shared/ui/Popover/SettingsPopover.tsx`.
- Shared focus utility: `src/shared/ui/useDialogFocus.ts`.
- Shared fields: `Input`, `Select`, `SettingsFilter`, `SettingsFilters`.
- Shared Accounting filters: `src/shared/ui/DataTable/useRecordFilters.tsx`.
- Design system: `docs/design-system/06-component-standards.md`, `08-interactions-and-motion.md`.

## Design Decisions

1. **Spacing** — `SettingsPopover` body padding remains `p-3`; arbitrary selectors strip `.p-4` and first-child `mt-3` so every first field is flush.
2. **Focus** — extend `useDialogFocus` with `focus: "editable"` and `skipMobile`. `SettingsPopover` uses `focus: "editable"` and `skipMobile: true`.
3. **Select focus** — no input means the panel receives focus; select triggers are never focused or opened automatically.
4. **Placeholders** — Settings popovers apply one colour (`#94a3b8`) and 13px size to input/textarea placeholders; `Select` exposes `data-select-placeholder` and `data-select-trigger` for the same treatment.
5. **Labels** — popover title is the visible label; `Input` uses `aria-label`, `Select` uses `ariaLabel`; no duplicate visible label.
6. **Search** — Accounting search is a `SettingsFilter` chip with a Settings popover, matching Settings/Categories.
7. **Scope** — fix popovers in Accounting, Business Settings and Personal.

## Validation

- `tsc -b`, lint, build, accounting i18n.
- Manual audit of all filter popover call sites.

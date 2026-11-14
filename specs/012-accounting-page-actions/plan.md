# Implementation Plan: Accounting page actions

**Branch**: `012-accounting-page-actions` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Move page-level create actions into the shared Settings-style filter toolbar, add `+` icons, remove page descriptions, and align chart add/more actions with the view tabs.

## Technical Context

- Shared filters: `useRecordFilters` (adds an `actions` slot).
- Pages: Books, Bank connections, Category rules, Periods, Journals.
- Chart: `ChartOfAccountsPage`.
- Icons: `Plus` from lucide-react.

## Design Decisions

1. **Filter toolbar** — `useRecordFilters` accepts an `actions` node and renders it beside `SettingsFilters` inside `.settings-toolbar`.
2. **Create buttons** — each action uses `Plus size={15}` and `gap-2`.
3. **Descriptions** — remove the page-level paragraph under the shell title; keep contextual card/side-panel guidance.
4. **Chart** — wrap `SegmentedControl` and Add/More in one flex row; empty state keeps its onboarding Add.
5. **Permissions** — existing `canManage`/`canAdd`/`canDelete` guards remain.

## Validation

- `tsc -b`, lint, build and accounting i18n.

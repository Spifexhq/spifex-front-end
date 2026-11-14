# Implementation Plan: Accounting chart setup UX

**Branch**: `006-accounting-chart-setup-ux` | **Date**: 2026-11-14 | **Spec**: `spec.md`

## Summary

Remove the product tour, simplify the Accounting sidebar, neutralise AI setup entry points, wire the AI country question to the shared country list, add session-scoped scratch with a keep/discard confirmation, and rebuild the chart setup surface with a stronger manual paste experience.

## Technical Context

- React + TypeScript + Vite frontend.
- Shared UI: `Button`, `Card`, `Select`, `Textarea`, `ConfirmToast`, `DialogShell`.
- AI questionnaire questions are backend-owned; the frontend translates keys and may override option labels.
- Country data: `src/lib/location/countries.ts`.
- The AI context exposes an optional workspace country default; the questionnaire remains server-owned and text-validated.
- Manual import API already accepts `manual_text`; no manual-import contract change is planned.

## Constitution Check

- Reuse shared UI before adding primitives.
- Preserve Business routes and permissions.
- No database writes for scratch.
- Keep all user-visible text localised in en, pt, fr and de.
- Frontend-only feature; artifacts stay in the frontend `specs/` directory.

## Project Structure

```text
src/
  lib/location/countries.ts
  products/business/layouts/AccountingLayout/index.tsx
  products/business/pages/Accounting/
    components/AccountingSidebar.tsx
    chart/ChartOfAccountsPage.tsx
    chart/ChartImport.tsx
    chart/manualImport.ts
    pages/AccountingOverviewPage.tsx
    setup/guided/AccountingAiSetupContext.tsx
    setup/guided/AccountingAiSetupState.ts
    setup/guided/AccountingAiSetupScratch.ts
    setup/guided/AccountingAiSetupWizard.tsx
    setup/guided/QuestionField.tsx
  shared/ui/ProductTour/            # delete
```

## Design Decisions

1. **Sidebar** — remove `assistant` and `reconciliation` items; the panels stay mounted at layout level so Overview and chart actions can open them.
2. **Tour** — delete `ProductTour` entirely rather than leaving unused configuration.
3. **AI styling** — entry points use `variant="outline"`; wizard footer primary actions use `outlineBlack`; icon/label buttons add `gap-2`.
4. **Country** — store the localized country label in answers so the AI prompt receives a human-readable name; map the saved ISO code through `getCountries()`.
5. **Scratch** — `sessionStorage` key `spifex.accounting.ai-setup.scratch.v1`; the wizard reports whether answers exist; the provider owns the close confirmation.
6. **Manual validator** — a pure helper mirrors the backend header aliases and enum checks so errors appear before the request.
7. **Clipboard** — use `navigator.clipboard.writeText` with a transient copied state and an accessible label.

## Validation

- `npx tsc -b`
- `npm run lint`
- `npm run check:accounting-i18n`
- `npm run build`
- Focused manual review of responsive layout and side-panel close behaviour.

# Implementation Plan: Groups Full-Page Detail

**Spec**: `spec.md`
**Branch**: `016-groups-full-page-detail`

## Approach

1. Keep the existing data loading, permission locks, dirty normalization, save/discard and group CRUD handlers unchanged.
2. Split the render branch into two mutually exclusive surfaces inside the existing settings page frame:
   - full-width groups browser with search, create action and responsive group cards;
   - full-width group editor with a Back to groups button, group identity/actions, `GroupScopeEditor` and `PermissionExplorer`.
3. Add a dedicated back-discard confirmation using the existing `ConfirmToast` rather than `window.confirm`.
4. Add localized `right.backToGroups` and back-discard copy in en/de/fr/pt.
5. Preserve the existing `PermissionMiddleware`, system-group read-only rules and loading/sync indicators.

## Files

- `src/products/business/pages/Settings/GroupSettings/index.tsx`
- `src/lib/i18n/locales/{en,de,fr,pt}/groupSettings.json`

## Design-system mapping

- `Card` for the list and detail surfaces.
- `Button` outline/ghost for Back; primary for Add group.
- `Input` for search.
- `Badge` for system group/status metadata.
- `EmptyState` for no groups/no match.
- `ConfirmToast` for dirty Back.
- Existing `px-4 pb-10 pt-6 sm:px-7`, `max-w-[1440px]`, `space-y-5`, `rounded-lg`, `border-gray-200`, `bg-gray-50` conventions.

## Risks

- Accidental loss of unsaved changes: mitigated with a Back confirmation.
- Layout regression at mobile widths: use responsive grid and wrap actions.
- Permission regression: handlers and middleware are not changed.

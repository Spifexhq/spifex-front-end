# Convergence: Groups Full-Page Detail

## Implemented

- Replaced the fixed 300px master rail + right panel with two mutually exclusive full-width views.
- The default view is a responsive groups browser (`1/2/3` columns) with search, Add group and system badges.
- Selecting a group opens a full-width editor; the list is removed from the page.
- Added `Back to groups` with `ArrowLeft`, busy locking and a dirty-state `ConfirmToast`.
- Preserved create/rename/duplicate/delete, save/discard, scope editor, permission explorer and permission middleware.
- Added localized `right.backToGroups`, `right.loading`, `right.permissions` and `right.system` in en/de/fr/pt.

## Verification

- `npx tsc -b`: pass.
- Scoped ESLint on GroupSettings: pass.
- `npm run test:permissions`: 12/12 pass.
- `npm run build`: pass.

## Notes

- No API, route, permission-code or scope-payload changes.
- Back on a clean editor returns immediately; Back with unsaved changes prompts before discarding.
- Responsive behavior uses the existing settings content frame and design-system cards/buttons.

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

## Checkbox follow-up

- Permission and resource-scope checkboxes now use the shared `@/shared/ui/Checkbox` component (`size="small"`) instead of raw inputs.
- Disabled, read-only and aria-label behavior is preserved.

## Permission UX follow-up

- Removed the internal implementation note "The backend remains authoritative. Plan and delegation limits are enforced on save." from the permission explorer footer; only the actionable missing-dependency warning remains.
- The resource-scope area no longer renders one stacked block per scoped permission. It shows a single capability chip row for the selected scoped permissions plus one active scope panel (mode selector, resource search and checkboxes) for the chosen capability.
- The active capability is kept in sync when permissions are toggled, and `none`/`all`/`selected` handling, `ALL_ONLY_SCOPE_CODES` restrictions and scope payload shape are unchanged.
- Repaired corrupted accented characters in `de/fr/pt` `groupSettings.json` and `groupPermissionsTable.json` (pre-existing, they made `scripts/locale-encoding.test.mjs` fail on `main`) and removed the now-unused `explorer.footerHint` key.
- Removed the transient "Added required dependencies: …" notice shown after toggling a permission. Dependency expansion still applies automatically; only blocking warnings are surfaced now. The unused `dependency.added` locale key and the now-unneeded `info` notice tone were removed.

## Verification (permission UX follow-up)

- `npx tsc -b`: pass.
- Scoped ESLint on GroupSettings: pass.
- `npm run test:permissions`: 12/12 pass.
- `node --test scripts/locale-encoding.test.mjs`: pass.
- `npm run build`: pass.

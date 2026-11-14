# Phase 21 - Inventory refinements

**Date**: 2026-11-14
**Feature**: `spifex-back-end/specs/016-inventory-refinements`

## Scope

- Overview tables render at natural height with `DataTable.fitContent`; no
  inner vertical scrollbar.
- Stock balances, movements and Locations lists open preview drawers.
- Item, stock and location previews show unit, reorder point, current price,
  stock value and status.
- Filters now include unit (items), item (stock and movements), default
  (locations), plus the existing status/type/date filters.
- Unit cost is effective-dated history with add/correct support.
- Units are a closed vocabulary enforced by the database.
- Location previews: stock rows are cursor-paginated with a range label, compact previous/next
  controls and a 20/50/100 rows-per-page selector.
- Movement dates use `formatDateFromISO`, matching cash-flow lists.
- Item preview and price history now use the shared stacked-preview pattern:
  price history stacks on the item preview, closing pops back, and unrelated
  items replace the stack. Page edges slide without fading; preview content
  slides in.
- Locations use a neutral `Default` badge and categories-style `StatusDot`
  active/inactive states.
- Shared `StatusDot` added; `AccountingStatus` wraps it.

## Backend

- `inventory/units.py` with `UnitOfMeasure`, aliases and normalization.
- `InventoryItem.uom` choices + `inv_valid_uom` check constraint.
- `InventoryItemPrice` and `/inventory/prices/` list/retrieve/create/correct API.
- Migration `0005` creates the price model, normalizes units, seeds initial
  prices and adds the check constraint.
- Location list filter `is_default`.
- Item create/edit seeds/appends price history.

## Verification

| Check | Result |
| --- | --- |
| `python manage.py check` | Pass |
| `python manage.py makemigrations --check --dry-run` | No changes detected |
| `python -m compileall inventory` | Pass |
| Disposable SQLite migrate `inventory` `0005` | Pass |
| Disposable price service check | Initial price, append, older correction, latest correction and item edit passed |
| Disposable unit check | Invalid unit blocked by the database |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; pre-existing warnings only |
| `npm run build` | Pass |
| Inventory locale parity | en/pt/fr/de have identical keys |
| `npm run check:accounting-i18n` | Pass |

## Notes

- Price entries are never deleted; corrections update the row and resync the
  item's current price.
- The price correction write path selects only `item`; `created_by` is joined
  on reads only, avoiding PostgreSQL's `FOR UPDATE` outer-join restriction.
- Same-day price changes are allowed; ordering falls back to the row id.
- Fixed currency parsing for 4-decimal API values: `100.0000` now renders and
  edits as `100.00`, not `1,000,000.00`; price-form initial values are
  normalised to two decimals.
- The overview `fitContent` option is opt-in so full record tables keep their
  shared max-height scroll.

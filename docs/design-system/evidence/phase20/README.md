# Phase 20 - Business Inventory section

**Date**: 2026-11-14
**Feature**: `spifex-back-end/specs/015-business-inventory-section`

## Scope

- Added a first-class Business Inventory section at `/inventory` with its own
  layout, sidebar and collapse persistence.
- Pages: Overview, Items, Stock (balances/movements) and Locations.
- `/settings/inventory` now redirects to `/inventory/items`; the Settings
  sidebar no longer lists Inventory.
- Added workspace sidebar entry, navbar title/breadcrumbs and en/pt/fr/de copy.
- Added the shared `MetricCard` and migrated `AccountingMetricCard` onto it.

## Backend

- Extended `InventoryItem` with `reorder_point` and `unit_cost`.
- Added `InventoryLocation`, `InventoryStockLevel` and append-only
  `StockMovement`.
- Added default-location and legacy stock backfill migrations.
- Movement item/location references are protected so hard-deleting an item or
  location cannot erase stock history.
- Added routes:
  - `GET /inventory/summary/`
  - `GET /inventory/stock/`
  - `GET|POST /inventory/movements/`
  - `POST /inventory/movements/transfer/`
  - `GET /inventory/items/{id}/stock/`
  - `GET|POST /inventory/locations/`
  - `GET /inventory/locations/options/`
  - `GET|PATCH|DELETE /inventory/locations/{id}/`
- Stock writes lock item/location/level rows, reject negative balances and bump
  item revisions.
- Existing item list/options/bulk/create/edit/delete contracts are preserved.

## Frontend

- Overview: six metrics, low/out-of-stock table, recent movements, stock by
  location.
- Items: server filters (search/status/stock), DataTable, preview drawer with
  per-location stock and recent movements, create/edit drawer.
- Stock: balances/movements segments with URL state, adjustment and transfer
  drawers.
- Locations: server filters, DataTable, create/edit drawer.
- `useRecordFilters` gained optional `initialApplied` so linked filters
  (`?status=low`) work without duplicating the filter engine.

## Verification

| Check | Result |
| --- | --- |
| `python manage.py check` | Pass |
| `python manage.py makemigrations --check --dry-run` | No changes detected |
| `python -m compileall inventory` | Pass |
| `python manage.py sqlmigrate inventory 0002` | Valid PostgreSQL SQL |
| Disposable SQLite migrate `inventory` | Pass (`0001`-`0004`) |
| Disposable stock service check | Pass (receipt/issue/adjustment/transfer + summary) |
| Disposable item/location service check | Pass (opening stock, edit adjustment, location rename) |
| `python manage.py test inventory` | Blocked by pre-existing test DB migration graph (`NewStatementParsedResult has no field named organization`) |
| `npx tsc -b --pretty false` | Pass |
| `npm run lint` | 0 errors; 7 pre-existing warnings |
| `npm run build` | Pass |
| inventory locale key parity | 196 keys in en/pt/fr/de |

## Notes

- The new list endpoints are uncached; item revisions still invalidate cached
  item lists/options after stock writes.
- Operational stock writes enforce `change_inventory` without consuming metered
  item quota.
- Transfers do not change `InventoryItem.quantity_on_hand`.
- Item edits that change quantity keep the legacy API path but log an
  adjustment; the new item form does not expose quantity after creation.

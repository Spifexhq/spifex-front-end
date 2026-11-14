// src/models/settings/inventory.ts
import type { Paginated } from "@/models/Api";

/* --------------------------------- Read model -------------------------------- */

export type InventoryStockStatus = "ok" | "low" | "out";

export interface InventoryItem {
  id: string; // external_id from the API
  version?: string;
  sku: string;
  name: string;
  description: string | null;
  uom: string | null;
  quantity_on_hand: string;
  reorder_point: number;
  unit_cost: string;
  stock_status: InventoryStockStatus;
  is_active: boolean;
}

export interface InventoryAllocation {
  item_id: string | null;
  sku: string;
  name: string;
  quantity: string;
}

export interface InventoryLocation {
  id: string;
  version?: string;
  code: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  stock_quantity: number;
  updated_at?: string;
}

export interface InventoryLocationOption {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
}

export interface InventoryStockLevel {
  id: string;
  item_id: string;
  sku: string;
  name: string;
  uom: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  quantity: number;
  reorder_point: number;
  status: InventoryStockStatus;
  updated_at?: string;
}

export type StockMovementType =
  | "opening"
  | "receipt"
  | "issue"
  | "adjustment"
  | "transfer_in"
  | "transfer_out";

export interface StockMovement {
  id: string;
  occurred_at: string;
  movement_type: StockMovementType;
  quantity_delta: number;
  item_id: string;
  sku: string;
  name: string;
  uom: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  reference: string;
  reason: string;
  created_by: string | null;
  creation_date?: string;
}

export interface InventorySummary {
  total_items: number;
  active_items: number;
  total_units: number;
  stock_value: string;
  currency_code: string;
  low_stock_count: number;
  out_of_stock_count: number;
  locations_count: number;
  movements_30d: number;
  low_stock_items: InventoryItem[];
  recent_movements: StockMovement[];
  by_location: Array<{
    location_id: string;
    code: string;
    name: string;
    is_default: boolean;
    quantity: number;
    item_count: number;
    updated_at?: string;
  }>;
}

export interface InventoryItemPrice {
  id: string;
  version?: string;
  item_id: string;
  sku: string;
  name: string;
  uom: string | null;
  unit_cost: string;
  effective_at: string;
  reason: string;
  created_by: string | null;
  creation_date?: string;
}

export interface GetInventoryPricesParams {
  cursor?: string;
  page_size?: number;
  include_count?: "true";
  item?: string;
}

export type GetInventoryPricesResponse = Paginated<InventoryItemPrice>;

export interface AddInventoryPriceRequest {
  item_id: string;
  unit_cost: string;
  effective_at?: string;
  reason?: string;
}

export type EditInventoryPriceRequest = Partial<Omit<AddInventoryPriceRequest, "item_id">>;

/* -------------------------------- Query params ------------------------------- */

export interface GetInventoryItemsParams {
  cursor?: string;
  page_size?: number;
  include_count?: "true";

  // chips (separated)
  sku?: string;
  name?: string;
  description?: string;
  uom?: string;

  // status
  active?: "true" | "false";
  stock_status?: InventoryStockStatus;

  // qty range
  min_qoh?: string; // keep string to match API style
  max_qoh?: string; // keep string to match API style

  // legacy fallback (optional)
  q?: string;
}

/**
 * Use shared Paginated model; count is intentionally discarded.
 */
export type GetInventoryItemsResponse = Paginated<InventoryItem>;

export type GetInventoryItemResponse = InventoryItem;

export interface GetInventoryLocationsParams {
  cursor?: string;
  page_size?: number;
  include_count?: "true";
  active?: "true" | "false";
  is_default?: "true" | "false";
  q?: string;
}

export type GetInventoryLocationsResponse = Paginated<InventoryLocation>;

export interface GetInventoryStockParams {
  cursor?: string;
  page_size?: number;
  include_count?: "true";
  item?: string;
  location?: string;
  status?: InventoryStockStatus;
  active?: "true" | "false";
  q?: string;
}

export type GetInventoryStockResponse = Paginated<InventoryStockLevel>;

export interface GetInventoryMovementsParams {
  cursor?: string;
  page_size?: number;
  include_count?: "true";
  item?: string;
  location?: string;
  movement_type?: StockMovementType;
  date_from?: string;
  date_to?: string;
  q?: string;
}

export type GetInventoryMovementsResponse = Paginated<StockMovement>;

/* --------------------------------- Write DTOs -------------------------------- */

export interface AddInventoryItemRequest {
  sku: string;
  name: string;
  description?: string | null;
  uom?: string | null;
  quantity_on_hand?: string; // keep string
  reorder_point?: number;
  unit_cost?: string;
  is_active?: boolean;
}

export type EditInventoryItemRequest = Partial<AddInventoryItemRequest>;

export interface AddInventoryLocationRequest {
  code: string;
  name: string;
  description?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export type EditInventoryLocationRequest = Partial<AddInventoryLocationRequest>;

export interface AddStockMovementRequest {
  item_id: string;
  location_id: string;
  movement_type: "receipt" | "issue" | "adjustment";
  quantity: number;
  reference?: string;
  reason?: string;
  occurred_at?: string;
}

export interface TransferStockRequest {
  item_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  reference?: string;
  reason?: string;
  occurred_at?: string;
}

/* --------------------------------- Bulk DTOs -------------------------------- */

export interface InventoryItemsBulkRequest {
  ids: string[];
}
export type InventoryItemsBulkResponse = InventoryItem[];

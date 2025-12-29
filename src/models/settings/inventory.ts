// src/models/settings/inventory.ts
import type { Paginated } from "@/models/Api";

/* --------------------------------- Read model -------------------------------- */

export interface InventoryItem {
  id: string;        // external_id from the API
  sku: string;
  name: string;
  description: string | null;
  uom: string | null;
  quantity_on_hand: string;
  is_active: boolean;
}

export interface InventoryAllocation {
  item_id: string | null;
  sku: string;
  name: string;
  quantity: string;
}

/* -------------------------------- Query params ------------------------------- */

export interface GetInventoryItemsParams {
  cursor?: string;
  active?: "true" | "false";
  q?: string;
}

/**
 * Use shared Paginated model; count is intentionally discarded.
 */
export type GetInventoryItemsResponse = Paginated<InventoryItem>;

export type GetInventoryItemResponse = InventoryItem;

/* --------------------------------- Write DTOs -------------------------------- */

export interface AddInventoryItemRequest {
  sku: string;
  name: string;
  description?: string | null;
  uom?: string | null;
  quantity_on_hand?: string; // keep string
  is_active?: boolean;
}

export type EditInventoryItemRequest = Partial<AddInventoryItemRequest>;

/* --------------------------------- Bulk DTOs -------------------------------- */

export interface InventoryItemsBulkRequest {
  ids: string[];
}
export type InventoryItemsBulkResponse = InventoryItem[];

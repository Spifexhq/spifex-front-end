import { InventoryItem } from "../domain/InventoryItem";

export interface GetInventoryItems {
  inventory_items: InventoryItem[];
}

export interface GetInventoryItem {
  inventory_item: InventoryItem;
}

export interface InventoryItemPayloadBase {
  sku: string;
  name: string;
  description?: string | null;
  uom?: string | null;
  quantity_on_hand?: string;
  is_active?: boolean;
}

export type AddInventoryItemRequest = InventoryItemPayloadBase;
export type EditInventoryItemRequest = InventoryItemPayloadBase;

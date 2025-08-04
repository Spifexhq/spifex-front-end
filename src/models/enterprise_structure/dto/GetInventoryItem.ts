import { InventoryItem } from "../domain/InventoryItem";

export interface GetInventoryItems {
  inventory_items: InventoryItem[];
}

export interface GetInventoryItem {
  inventory_item: InventoryItem;
}

export interface InventoryItemPayloadBase {
  inventory_item_code: string | null;
  inventory_item: string | null;
  inventory_item_quantity: number | null;
}

export type AddInventoryItemRequest = InventoryItemPayloadBase;
export type EditInventoryItemRequest = InventoryItemPayloadBase;
// models/enterprise_structure/dto/GetInventoryItem.ts
import { InventoryItem } from "../domain/InventoryItem";

export interface GetInventoryItemsResponse {
  results: InventoryItem[];
  next?: string | null;
  previous?: string | null;
  count?: number;
}

export type GetInventoryItemResponse = InventoryItem;

export type AddInventoryItemRequest = {
  sku: string;
  name: string;
  description?: string | null;
  uom?: string | null;
  quantity_on_hand?: string; // mantém string
  is_active?: boolean;
};

export type EditInventoryItemRequest = Partial<AddInventoryItemRequest>;

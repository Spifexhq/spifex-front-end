// models/enterprise_structure/domain/InventoryItem.ts
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

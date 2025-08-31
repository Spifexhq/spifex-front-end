export interface InventoryItem {
  id: string;
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

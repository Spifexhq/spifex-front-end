export interface InventoryItem {
  id: number;
  inventory_item_code: string | null;
  inventory_item: string | null;
  inventory_item_quantity: number | null;
  uuid_inventory_item: string | null;
};

export interface InventoryAllocation {
  inventory_item: InventoryItem;
  inventory_item_quantity: number;
};

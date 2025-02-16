export type Inventory = {
  id: number;
  inventory_item_code: string | null;
  inventory_item: string | null;
  inventory_item_quantity: number | null;
  uuid_inventory_item: string | null;
};

export type ApiGetInventoryItems = {
  inventory_items: Inventory[];
};

export type ApiGetInventoryItem = {
  inventory_item: Inventory;
};

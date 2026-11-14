import { useCallback, useEffect, useState } from "react";
import { api } from "@/core/api/requests";
import { fetchAllCursor } from "@/lib/list";
import type { InventoryItem, InventoryLocationOption } from "@/models/settings/inventory";

/** Loads the active item and location choices shared by stock panels. */
export function useInventoryPickers(enabled = true) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocationOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemRows, locationResponse] = await Promise.all([
        fetchAllCursor<InventoryItem>(params => api.getInventoryOptions(params)),
        api.getInventoryLocationOptions(),
      ]);
      setItems(itemRows);
      setLocations(locationResponse.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  return { items, locations, loading, reload: load };
}

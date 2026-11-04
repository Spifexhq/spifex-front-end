import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/requests";
import type { ApiResponse } from "@/models/Api";
import type { Visualization } from "@/models/components/filterBar";
import { extractArray, isApiError } from "../FilterBar.utils";

export function useSavedViews(settlementStatus: boolean, enabled = true) {
  const [views, setViews] = useState<Visualization[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res: ApiResponse<unknown> = await api.getViewPresets(settlementStatus);
      if (isApiError(res)) {
        console.error("Failed to load saved views", res.error);
        setViews([]);
        return;
      }
      setViews(extractArray<Visualization>(res.data));
    } catch (err) {
      console.error("Failed to load saved views", err);
      setViews([]);
    } finally {
      setLoaded(true);
    }
  }, [settlementStatus]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [refresh, enabled]);

  return { views, loaded, refresh };
}

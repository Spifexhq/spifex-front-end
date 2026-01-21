import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/requests";
import type { ApiResponse } from "@/models/Api";
import type { Visualization } from "@/models/components/filterBar";
import { extractArray, isApiError } from "../FilterBar.utils";

export function useSavedViews() {
  const [views, setViews] = useState<Visualization[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res: ApiResponse<unknown> = await api.getViewPresets();
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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { views, loaded, refresh };
}

import { useEffect, useState } from "react";
import { api } from "@/api/requests";
import type { CashflowCategoryOption } from "@/models/entries/entries";

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];

  const obj = input as Record<string, unknown>;
  for (const key of ["results", "items", "data", "categories"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
  }

  if (obj.data && obj.data !== input) {
    return extractCollection<T>(obj.data);
  }

  return [];
}

export function useCashflowCategories() {
  const [categories, setCategories] = useState<CashflowCategoryOption[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const response = await api.getCashflowCategories({ active: "true" });
        const items = extractCollection<CashflowCategoryOption>(
          (response as { data?: unknown })?.data ?? response
        );
        if (!alive) return;
        setCategories(items);
      } catch (err) {
        console.error("Failed to load cashflow categories", err);
        if (!alive) return;
        setCategories([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return categories;
}

import { useEffect, useState } from "react";
import { api } from "@/core/api/requests";
import type { CashflowCategory } from "@/models/settings/categories";
import { personalApi } from "@/products/personal/services/api";
import type { PersonalCategory } from "@/products/personal/types";

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

export function useCashflowCategories(enabled = true, personal = false) {
  const [categories, setCategories] = useState<CashflowCategory[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    (async () => {
      try {
        let items: CashflowCategory[];
        if (personal) {
          const response = await personalApi.list<PersonalCategory>("categories", { page: 1, page_size: 100 });
          items = (response.data?.results ?? []).filter(category => category.is_active).map(category => ({
            id: category.id,
            parent_id: null,
            code: "",
            name: category.name,
            description: "",
            tx_type_hint: category.kind === "income" ? "credit" : category.kind === "expense" ? "debit" : null,
            is_active: category.is_active,
            sort_order: 0,
            metadata: {},
          }));
        } else {
          const response = await api.getCashflowCategories({ active: "true" });
          items = extractCollection<CashflowCategory>(
            (response as { data?: unknown })?.data ?? response
          );
        }
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
  }, [enabled, personal]);

  return categories;
}

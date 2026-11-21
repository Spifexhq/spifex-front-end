import { personalApi } from "@/products/personal/services/api";
import type { ForecastLoader } from "@/shared/financial/components/CashFlowTrend/types";

/** Personal forecast: open transactions for the window plus the available balance. */
export const loadPersonalForecast: ForecastLoader = async (window, filters) => {
  const params: Record<string, string> = {
    start_date: window.start,
    end_date: window.end,
    basis: "planned",
    group_by: window.groupBy,
  };
  if (filters.cashflow_category_id) params.cashflow_category_id = filters.cashflow_category_id;
  if (filters.description) params.description = filters.description;

  const response = await personalApi.dashboard(false, params);
  const payload = response.data;
  const mixed = (payload.balances_by_currency?.length ?? 0) > 1;
  const balanceAllowed = payload.capabilities?.banks !== false;
  const balance = Number(payload.available_balance ?? 0);

  return {
    buckets: Array.isArray(payload.series) ? payload.series : [],
    currency: payload.currency ?? null,
    opening: !balanceAllowed || mixed || !Number.isFinite(balance) ? null : balance,
  };
};

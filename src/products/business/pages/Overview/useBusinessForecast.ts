import { api } from "@/core/api/requests";
import type { GetBanksTableResponse } from "@/models/settings/banking";
import type { ApiSuccess } from "@/models/Api";
import type { ForecastLoader } from "@/shared/financial/components/CashFlowTrend/types";

/**
 * Business forecast: open entries for the window, plus the consolidated balance
 * from the banking table (the overview bank list is truncated and may mix currencies).
 */
export const loadBusinessForecast: ForecastLoader = async (window, filters) => {
  const [overview, banks] = await Promise.all([
    api.getOverview({
      start_date: window.start,
      end_date: window.end,
      basis: "planned",
      group_by: window.groupBy,
      ...filters,
    }),
    api.getBanksTable({ active: true, ids: [] }).catch(() => null),
  ]);

  const payload = overview.data;
  const bankPayload = (banks as ApiSuccess<GetBanksTableResponse> | null)?.data;
  const blocked =
    !bankPayload ||
    bankPayload.can_view_balance === false ||
    bankPayload.mixed_currencies === true;
  const total = Number(String(bankPayload?.total_consolidated_balance ?? "0"));

  return {
    buckets: Array.isArray(payload.series) ? payload.series : [],
    currency: payload.currency ?? null,
    opening: blocked || !Number.isFinite(total) ? null : total,
  };
};

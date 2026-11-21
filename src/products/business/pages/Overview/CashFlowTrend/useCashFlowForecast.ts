import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/core/api/requests";
import type { OverviewData, OverviewQuery } from "@/models/finance/overview";
import type { GetBanksTableResponse } from "@/models/settings/banking";
import type { ApiSuccess } from "@/models/Api";
import { localISO } from "../overviewUtils";

export type RangeKey = "7d" | "30d" | "90d" | "365d";

export type ForecastRange = {
  key: RangeKey;
  days: number;
  /** 1Y is bucketed by week so the plot keeps readable density. */
  groupBy: "day" | "week";
};

export const FORECAST_RANGES: ForecastRange[] = [
  { key: "7d", days: 7, groupBy: "day" },
  { key: "30d", days: 30, groupBy: "day" },
  { key: "90d", days: 90, groupBy: "day" },
  { key: "365d", days: 365, groupBy: "week" },
];

export type ForecastState = {
  data: OverviewData | null;
  /** Consolidated balance today; `null` when it is unavailable or mixes currencies. */
  opening: number | null;
  loading: boolean;
  failed: boolean;
};

function rangeDates(range: ForecastRange) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + range.days - 1);
  return { start: localISO(start), end: localISO(end) };
}

/**
 * Due entries for the forward window, independent from the page period so the
 * card can offer its own forecast horizon.
 */
export function useCashFlowForecast(range: ForecastRange, filters: Pick<OverviewQuery, "cashflow_category_id" | "description">) {
  const [state, setState] = useState<ForecastState>({ data: null, opening: null, loading: true, failed: false });
  const [nonce, setNonce] = useState(0);
  const request = useRef(0);

  const { start, end } = useMemo(() => rangeDates(range), [range]);
  const category = filters.cashflow_category_id ?? "";
  const description = filters.description ?? "";

  useEffect(() => {
    const id = ++request.current;
    setState((previous) => ({ ...previous, loading: true, failed: false }));

    api
      .getOverview({
        start_date: start,
        end_date: end,
        basis: "planned",
        group_by: range.groupBy,
        ...(category ? { cashflow_category_id: category } : {}),
        ...(description ? { description } : {}),
      })
      .then((response) => {
        if (id !== request.current) return;
        const payload = response.data;
        setState((previous) => ({
          ...previous,
          data: {
            ...payload,
            series: Array.isArray(payload.series) ? payload.series : [],
            banks: Array.isArray(payload.banks) ? payload.banks : [],
          },
          loading: false,
          failed: false,
        }));
      })
      .catch(() => {
        if (id !== request.current) return;
        setState((previous) => ({ ...previous, loading: false, failed: true }));
      });
  }, [category, description, end, range.groupBy, start, nonce]);

  // The projection needs one consolidated balance, not the paginated bank list.
  useEffect(() => {
    let alive = true;

    api
      .getBanksTable({ active: true, ids: [] })
      .then((response: ApiSuccess<GetBanksTableResponse>) => {
        if (!alive) return;
        const payload = response.data;
        const blocked = payload?.can_view_balance === false || payload?.mixed_currencies === true;
        const total = Number(String(payload?.total_consolidated_balance ?? "0"));
        setState((previous) => ({ ...previous, opening: blocked || !Number.isFinite(total) ? null : total }));
      })
      .catch(() => {
        if (!alive) return;
        setState((previous) => ({ ...previous, opening: null }));
      });

    return () => {
      alive = false;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, start, end, reload };
}

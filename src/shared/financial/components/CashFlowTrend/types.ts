import type { PeriodPoint } from "@/models/finance/overview";

export type RangeKey = "7d" | "30d" | "90d" | "365d";

export type ForecastWindow = {
  start: string;
  end: string;
  /** 1Y is bucketed by week so the plot keeps readable density. */
  groupBy: "day" | "week";
};

export type ForecastFilters = {
  cashflow_category_id?: string;
  description?: string;
};

export type ForecastPayload = {
  buckets: PeriodPoint[];
  /** Consolidated balance today, or `null` when the projection cannot be trusted. */
  opening: number | null;
  currency: string | null;
};

/** Product-specific data access: Business overview + banking, Personal dashboard. */
export type ForecastLoader = (window: ForecastWindow, filters: ForecastFilters) => Promise<ForecastPayload>;

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

export type OverviewBasis = "settled" | "planned";
export type OverviewQuery = { start_date: string; end_date: string; basis: OverviewBasis; group_by: "day" | "week" | "month"; bank_id?: string; cashflow_category_id?: string; description?: string };
export type PeriodPoint = { date: string; in: string; out: string; net: string; count: number };
export type OverviewTotals = { in: string; out: string; net: string; count: number };
export type OverviewRecord = { id: string; entry_id?: string; description: string; date: string; amount: string; tx_type: number; category?: string | null; bank?: string | null };
export type OverviewData = {
  organization: { id: string; name: string }; currency: string | null;
  period: { start: string; end: string; previous_start: string; previous_end: string; basis: OverviewBasis; group_by: string };
  capabilities: { metrics: boolean; entries: boolean; open_entries: boolean; banks: boolean };
  metrics: OverviewTotals | null; previous: OverviewTotals | null; series: PeriodPoint[]; activity: PeriodPoint[];
  categories: { id: string; name: string | null; amount: string }[];
  recent: OverviewRecord[]; attention: OverviewRecord[]; upcoming: OverviewRecord[];
  banks: { id: string; name: string; account: string; currency: string; balance: string }[];
  filter_options: { categories: { id: string; label: string }[]; banks: { id: string; label: string }[] };
};

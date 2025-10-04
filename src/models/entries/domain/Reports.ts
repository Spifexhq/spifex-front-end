// models/entries/domain/reports.ts
export type ReportsSummary = {
  totals: {
    in_minor: number;
    out_abs_minor: number;
    net_minor: number;
    settlement_rate: number; // 0..1
  };
  mtd: { in_minor: number; out_minor: number; net_minor: number };
  mom: { change: number | null; infinite: boolean; prev_net_minor: number };
  overdue: { rec_minor: number; pay_minor: number; net_minor: number };
  next7: { rec_minor: number; pay_minor: number; net_minor: number };
  next30: { rec_minor: number; pay_minor: number; net_minor: number };
  monthly: {
    bars: { key: string; month: string; inflow_minor: number; outflow_minor: number; net_minor: number }[];
    cumulative: { key: string; month: string; cumulative_minor: number }[];
  };
  pie: { name: string; value_minor: number }[];
  overdue_items: { id: string; date: string; desc: string; type: "Receber" | "Pagar"; amount_minor: number }[];
};

export type ReportsSummaryResponse = {
  data: ReportsSummary;
  meta?: { request_id?: string | null };
};

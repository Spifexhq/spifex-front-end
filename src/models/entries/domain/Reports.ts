// models/entries/domain/reports.ts

export type Money = number; // ✅ decimal major units (e.g. 10.25)

export type ReportsSummary = {
  totals: {
    in: Money;
    out_abs: Money;
    net: Money;
    settlement_rate: number; // 0..1
  };
  mtd: { in: Money; out: Money; net: Money };
  mom: { change: number | null; infinite: boolean; prev_net: Money };

  overdue: { rec: Money; pay: Money; net: Money };
  next7: { rec: Money; pay: Money; net: Money };
  next30: { rec: Money; pay: Money; net: Money };

  monthly: {
    bars: { key: string; month: string; inflow: Money; outflow: Money; net: Money }[];
    cumulative: { key: string; month: string; cumulative: Money }[];
  };

  pie: { name: string; value: Money }[];
  overdue_items: { id: string; date: string; desc: string; type: "Receber" | "Pagar"; amount: Money }[];
};

export type ReportsSummaryResponse = {
  data: ReportsSummary;
  meta?: { request_id?: string | null };
};

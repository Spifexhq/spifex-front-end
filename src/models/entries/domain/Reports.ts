// models/entries/domain/reports.ts

export enum TxType {
  DEBIT = -1,
  CREDIT = 1,
}

export type Money = number | string; // API sends decimal strings ("123.45"), UI parses

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

  overdue_items: {
    id: string;
    date: string; // "YYYY-MM-DD"
    desc: string;
    tx_type: TxType; // -1 / 1
    amount: Money;
  }[];
};

export type ReportsSummaryResponse = {
  data: ReportsSummary;
  meta?: { request_id?: string | null };
};

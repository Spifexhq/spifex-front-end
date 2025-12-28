// src/models/components/reports.ts

export enum TxType {
  DEBIT = -1,
  CREDIT = 1,
}

/**
 * API sends decimal strings ("123.45") but some legacy paths may still emit numbers.
 * Keep union for compatibility; normalize in UI if needed.
 */
export type Money = number | string;

export interface ReportsSummaryTotals {
  in: Money;
  out_abs: Money;
  net: Money;
  settlement_rate: number; // 0..1
}

export interface ReportsSummaryMonthlyBar {
  key: string;
  month: string;
  inflow: Money;
  outflow: Money;
  net: Money;
}

export interface ReportsSummaryMonthlyCumulative {
  key: string;
  month: string;
  cumulative: Money;
}

export interface ReportsSummaryPieItem {
  name: string;
  value: Money;
}

export interface ReportsSummaryOverdueItem {
  id: string;
  date: string; // YYYY-MM-DD
  desc: string;
  tx_type: TxType; // -1 / 1
  amount: Money;
}

export interface ReportsSummary {
  totals: ReportsSummaryTotals;

  mtd: { in: Money; out: Money; net: Money };
  mom: { change: number | null; infinite: boolean; prev_net: Money };

  overdue: { rec: Money; pay: Money; net: Money };
  next7: { rec: Money; pay: Money; net: Money };
  next30: { rec: Money; pay: Money; net: Money };

  monthly: {
    bars: ReportsSummaryMonthlyBar[];
    cumulative: ReportsSummaryMonthlyCumulative[];
  };

  pie: ReportsSummaryPieItem[];

  overdue_items: ReportsSummaryOverdueItem[];
}

export interface ReportsSummaryResponse {
  data: ReportsSummary;
  meta?: { request_id?: string | null };
}

/* ------------------------------- Query params ------------------------------- */

export interface ReportsSummaryParams {
  description?: string;
  observation?: string;
  gl?: string;        // comma-separated external_ids
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
}

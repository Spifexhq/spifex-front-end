export enum TxType {
  DEBIT = -1,
  CREDIT = 1,
}

export type Money = number | string;

export interface ReportsSummaryTotals {
  in: Money;
  out_abs: Money;
  net: Money;
  settlement_rate: number;
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
  date: string;
  desc: string;
  tx_type: TxType;
  amount: Money;
}

export interface ReportsSummaryMiniItem {
  id: string;
  date: string;
  desc: string;
  amount: Money;
  tx_type?: TxType;
}

export interface ReportsSummaryCounts {
  overdue_items: number;
  next7_items: number;
  next30_items: number;
}

export interface ReportsSummaryLiquidity {
  avg_monthly_outflow_abs: Money;
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

  counts?: ReportsSummaryCounts;
  liquidity?: ReportsSummaryLiquidity;
  largest_overdue_pay?: ReportsSummaryMiniItem | null;
  largest_overdue_rec?: ReportsSummaryMiniItem | null;
  next_due_items?: ReportsSummaryMiniItem[];
}

export interface ReportsSummaryResponse {
  data: ReportsSummary;
  meta?: { request_id?: string | null };
}

export interface ReportsSummaryParams {
  description?: string;
  observation?: string;
  ledger_account_id?: string;
  date_from?: string;
  date_to?: string;
}

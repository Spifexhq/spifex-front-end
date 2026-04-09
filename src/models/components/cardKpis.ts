// src/models/components/cardKpis.ts

export type MoneyDecimal = string;

export interface BaseKpiQueryParams {
  description?: string;
  observation?: string;
  cashflow_category_id?: string;
}

export type CashflowKpiQueryParams = BaseKpiQueryParams;

export type SettledKpiQueryParams = BaseKpiQueryParams & {
  bank_id?: string;
};

/**
 * Keep this generic alias if some request helpers still depend on it.
 */
export type KpiQueryParams =
  | CashflowKpiQueryParams
  | SettledKpiQueryParams;

/* ----------------------- Cashflow KPIs (planned / due) ----------------------- */

export type CashflowKpis = {
  period: {
    current_month: { start: string; end: string };
    previous_month: { start: string; end: string };
    next7: { start: string; end: string };
  };

  mtd: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };
  prev: { net: MoneyDecimal };

  mom_change: number | null;
  mom_infinite: boolean;

  next7: { rec: MoneyDecimal; pay: MoneyDecimal; net: MoneyDecimal };
  overdue: { rec: MoneyDecimal; pay: MoneyDecimal; net: MoneyDecimal };
};

/* ----------------------- Settled KPIs (realized / value) ---------------------- */

export type SettledKpis = {
  period: {
    current_month: { start: string; end: string };
    previous_month: { start: string; end: string };
    last7: { start: string; end: string };
  };

  mtd: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };
  prev: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };
  last7: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };

  mom_change: number | null;
  mom_infinite: boolean;
};

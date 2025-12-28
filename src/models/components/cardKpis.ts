// src/models/components/cardKpis.ts

export type MoneyDecimal = string;

/**
 * Generic query params used by KPI endpoints.
 * Keep it permissive because you are building params dynamically.
 */
export type KpiQueryParams = Record<string, string | number | undefined>;

/* ----------------------- Cashflow KPIs (planned / due) ----------------------- */

export type CashflowKpis = {
  period: {
    current_month: { start: string; end: string };
    previous_month: { start: string; end: string };
    next7: { start: string; end: string };
  };

  mtd: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };
  prev: { net: MoneyDecimal };

  /** Ratio in [-1..+∞) when finite, or null when infinite. */
  mom_change: number | null;
  /** True when MoM would be ±Infinity (prev == 0 and mtd != 0). */
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

  /** Ratio in [-1..+∞) when finite, or null when infinite. */
  mom_change: number | null;
  /** True when MoM would be ±Infinity (prev == 0 and mtd != 0). */
  mom_infinite: boolean;
};

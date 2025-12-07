// ✅ models (frontend) — replace the KPI types to use DECIMAL strings (2dp)
// e.g. src/models/entries/kpis.ts  (or wherever you keep these)

export type MoneyDecimal = string; // "1234.56" (2dp), can be negative

// Cashflow KPIs (planned / due_date based)
export type CashflowKpis = {
  period: {
    current_month: { start: string; end: string };
    previous_month: { start: string; end: string };
    next7: { start: string; end: string };
  };

  // ✅ now decimals (strings), not minors
  mtd: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };
  prev: { net: MoneyDecimal };

  /** Ratio in [-1..+∞) when finite, or null when infinite. */
  mom_change: number | null;
  /** True when MoM would be ±Infinity (prev == 0 and mtd != 0). */
  mom_infinite: boolean;

  next7: { rec: MoneyDecimal; pay: MoneyDecimal; net: MoneyDecimal };
  overdue: { rec: MoneyDecimal; pay: MoneyDecimal; net: MoneyDecimal };
};

// Settled KPIs (realized / value_date based)
export type SettledKpis = {
  period: {
    current_month: { start: string; end: string };
    previous_month: { start: string; end: string };
    last7: { start: string; end: string };
  };

  // ✅ now decimals (strings), not minors
  mtd: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };
  prev: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };
  last7: { in: MoneyDecimal; out: MoneyDecimal; net: MoneyDecimal };

  /** Ratio in [-1..+∞) when finite, or null when infinite. */
  mom_change: number | null;
  /** True when MoM would be ±Infinity (prev == 0 and mtd != 0). */
  mom_infinite: boolean;
};

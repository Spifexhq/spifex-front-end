export type Minor = number; // integer minor units (cents)

// Cashflow KPIs (planned / due_date based)
export type CashflowKpis = {
  period: {
    current_month: { start: string; end: string };
    previous_month: { start: string; end: string };
    next7: { start: string; end: string };
  };
  mtd: { in_minor: Minor; out_minor: Minor; net_minor: Minor };
  prev: { net_minor: Minor };
  /** Ratio in [-1..+∞) when finite, or null when infinite. */
  mom_change: number | null;
  /** True when MoM would be ±Infinity (prev == 0 and mtd != 0). */
  mom_infinite: boolean;
  next7: { rec_minor: Minor; pay_minor: Minor; net_minor: Minor };
  overdue: { rec_minor: Minor; pay_minor: Minor; net_minor: Minor };
};

// Settled KPIs (realized / value_date based)
export type SettledKpis = {
  period: {
    current_month: { start: string; end: string };
    previous_month: { start: string; end: string };
    last7: { start: string; end: string };
  };
  mtd: { in_minor: Minor; out_minor: Minor; net_minor: Minor };
  prev: { in_minor: Minor; out_minor: Minor; net_minor: Minor };
  last7: { in_minor: Minor; out_minor: Minor; net_minor: Minor };
  /** Ratio in [-1..+∞) when finite, or null when infinite. */
  mom_change: number | null;
  /** True when MoM would be ±Infinity (prev == 0 and mtd != 0). */
  mom_infinite: boolean;
};

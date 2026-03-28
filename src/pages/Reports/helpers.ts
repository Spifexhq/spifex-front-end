import { formatCurrency } from "@/lib/currency/formatCurrency";
import { formatDateFromISO } from "@/lib";
import type {
  Money,
  ReportsSummary,
  ReportsSummaryMiniItem,
  ReportsSummaryOverdueItem,
} from "@/models/components/reports";

export type ReportsTranslator = (
  key: string,
  options?: Record<string, unknown>
) => string;

export type Tone = "neutral" | "positive" | "negative";

export type RangeKey = "3M" | "6M" | "12M" | "ALL";

export type ChartRange = {
  labels: string[];
  data: number[];
};

export type SplitBarDatum = {
  key: string;
  month: string;
  inflow: number;
  outflow: number;
  net: number;
};

export type ReportMetric = {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
};

export type UiMiniItem = {
  id: string;
  date: string;
  dateLabel: string;
  desc: string;
  amount: number;
  tx_type?: number;
};

export const TX_DEBIT = -1;
export const TX_CREDIT = 1;

export const parseMoney = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = typeof v === "number" ? String(v) : String(v).trim();
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const toNum0 = (v: Money | unknown): number => parseMoney(v) ?? 0;

export const fmtMoney = (v: Money | unknown): string => {
  const n = parseMoney(v);
  return n === null ? "—" : formatCurrency(n);
};

export const asPct = (value: number, digits = 1): string =>
  `${(value * 100).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })}%`;

export const compactCurrency = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${Math.round(abs)}`;
};

function toUiMiniItem(item: ReportsSummaryMiniItem | ReportsSummaryOverdueItem): UiMiniItem {
  return {
    id: item.id,
    date: item.date,
    dateLabel: formatDateFromISO(item.date),
    desc: item.desc || "",
    amount: toNum0(item.amount),
    tx_type: "tx_type" in item && typeof item.tx_type !== "undefined" ? Number(item.tx_type) : undefined,
  };
}

function sliceRange<T>(rows: T[], key: RangeKey): T[] {
  if (key === "ALL") return rows;
  if (key === "12M") return rows.slice(-12);
  if (key === "6M") return rows.slice(-6);
  return rows.slice(-3);
}

export function buildLineRanges(monthlyCumulative: { month: string; cumulative: number }[]): Record<RangeKey, ChartRange> {
  const make = (key: RangeKey): ChartRange => {
    const rows = sliceRange(monthlyCumulative, key);
    return {
      labels: rows.map((row) => row.month),
      data: rows.map((row) => row.cumulative),
    };
  };

  return {
    "3M": make("3M"),
    "6M": make("6M"),
    "12M": make("12M"),
    "ALL": make("ALL"),
  };
}

export function buildBarRanges(monthlyBars: SplitBarDatum[]): Record<RangeKey, SplitBarDatum[]> {
  return {
    "3M": sliceRange(monthlyBars, "3M"),
    "6M": sliceRange(monthlyBars, "6M"),
    "12M": sliceRange(monthlyBars, "12M"),
    "ALL": sliceRange(monthlyBars, "ALL"),
  };
}

type BuildArgs = {
  data: ReportsSummary | null;
  totalConsolidatedBalance: number;
  t: ReportsTranslator;
};

export function buildReportsViewModel({ data, totalConsolidatedBalance, t }: BuildArgs) {
  const totalIn = toNum0(data?.totals.in);
  const totalOutAbs = toNum0(data?.totals.out_abs);
  const totalNet = toNum0(data?.totals.net);
  const settlementRate = Number(data?.totals.settlement_rate ?? 0);

  const mtdIn = toNum0(data?.mtd.in);
  const mtdOut = toNum0(data?.mtd.out);
  const mtdNet = toNum0(data?.mtd.net);

  const momInfinite = Boolean(data?.mom.infinite);
  const momChange = momInfinite ? Infinity : Number(data?.mom.change ?? 0);

  const overdueRec = toNum0(data?.overdue.rec);
  const overduePay = toNum0(data?.overdue.pay);
  const overdueNet = toNum0(data?.overdue.net);

  const next7Rec = toNum0(data?.next7.rec);
  const next7Pay = toNum0(data?.next7.pay);
  const next7Net = toNum0(data?.next7.net);

  const next30Rec = toNum0(data?.next30.rec);
  const next30Pay = toNum0(data?.next30.pay);
  const next30Net = toNum0(data?.next30.net);

  const monthlyBars: SplitBarDatum[] = (data?.monthly.bars ?? []).map((item) => ({
    key: item.key,
    month: item.month,
    inflow: toNum0(item.inflow),
    outflow: toNum0(item.outflow),
    net: toNum0(item.net),
  }));

  const monthlyCumulative = (data?.monthly.cumulative ?? []).map((item) => ({
    key: item.key,
    month: item.month,
    cumulative: toNum0(item.cumulative),
  }));

  const avgMonthlyOutflowAbs =
    toNum0(data?.liquidity?.avg_monthly_outflow_abs) ||
    (monthlyBars.length > 0
      ? monthlyBars.reduce((acc, row) => acc + Math.abs(row.outflow), 0) / monthlyBars.length
      : 0);

  const runwayMonths =
    avgMonthlyOutflowAbs > 0 ? totalConsolidatedBalance / avgMonthlyOutflowAbs : Infinity;

  const overdueItems = (data?.overdue_items ?? []).map(toUiMiniItem);
  const upcomingItems = (data?.next_due_items ?? []).map(toUiMiniItem);
  const largestOverduePay = data?.largest_overdue_pay ? toUiMiniItem(data.largest_overdue_pay) : null;
  const largestOverdueRec = data?.largest_overdue_rec ? toUiMiniItem(data.largest_overdue_rec) : null;

  const lineRanges = buildLineRanges(monthlyCumulative);
  const barRanges = buildBarRanges(monthlyBars);

  const last12 = lineRanges["12M"].data;
  const trendDelta = last12.length > 1 ? last12[last12.length - 1] - last12[0] : 0;

  const metrics: ReportMetric[] = [
    {
      label: t("kpis.balance"),
      value: fmtMoney(totalConsolidatedBalance),
      hint: t("kpis.balanceHint", { defaultValue: "Current consolidated bank balance" }),
      tone: "neutral",
    },
    {
      label: t("kpis.netPeriod"),
      value: fmtMoney(totalNet),
      hint: Number.isFinite(momChange)
        ? `${t("kpis.mom")} ${momChange >= 0 ? "+" : ""}${asPct(momChange)}`
        : t("kpis.noBaseline", { defaultValue: "No previous month baseline" }),
      tone: totalNet >= 0 ? "positive" : "negative",
    },
    {
      label: t("kpis.mtdNet"),
      value: fmtMoney(mtdNet),
      hint: `${t("kpis.in")} ${fmtMoney(mtdIn)} • ${t("kpis.out")} ${fmtMoney(mtdOut)}`,
      tone: mtdNet >= 0 ? "positive" : "negative",
    },
    {
      label: t("kpis.runway"),
      value: Number.isFinite(runwayMonths) ? `${runwayMonths.toFixed(1)} ${t("kpis.months", { defaultValue: "mo" })}` : "—",
      hint: t("kpis.runwayHint", { defaultValue: "Based on average monthly outflow" }),
      tone: Number.isFinite(runwayMonths) && runwayMonths < 3 ? "negative" : "neutral",
    },
    {
      label: t("kpis.overdueNet"),
      value: fmtMoney(overdueNet),
      hint: `${t("alerts.toReceive")} ${fmtMoney(overdueRec)} • ${t("alerts.toPay")} ${fmtMoney(overduePay)}`,
      tone: overdueNet >= 0 ? "positive" : "negative",
    },
    {
      label: t("kpis.next7"),
      value: fmtMoney(next7Net),
      hint: `${t("alerts.toReceive")} ${fmtMoney(next7Rec)} • ${t("alerts.toPay")} ${fmtMoney(next7Pay)}`,
      tone: next7Net >= 0 ? "positive" : "negative",
    },
    {
      label: t("kpis.next30"),
      value: fmtMoney(next30Net),
      hint: `${t("alerts.toReceive")} ${fmtMoney(next30Rec)} • ${t("alerts.toPay")} ${fmtMoney(next30Pay)}`,
      tone: next30Net >= 0 ? "positive" : "negative",
    },
    {
      label: t("kpis.settlementRate"),
      value: asPct(settlementRate),
      hint: t("kpis.settlementHint", { defaultValue: "Settled entries over total entries" }),
      tone: "neutral",
    },
  ];

  const insights: string[] = [];
  if (Number.isFinite(runwayMonths) && runwayMonths < 3) insights.push(t("insights.runwayLow"));
  if (Number.isFinite(runwayMonths) && runwayMonths >= 6) insights.push(t("insights.runwayHealthy"));
  if (mtdNet < 0) insights.push(t("insights.mtdNegative"));
  if (overduePay > overdueRec) insights.push(t("insights.overduePressure"));
  if (next7Pay > next7Rec) insights.push(t("insights.next7Pressure"));
  if (Number.isFinite(momChange) && momChange > 0) insights.push(t("insights.momPositive", { value: `+${asPct(momChange)}` }));
  if (Number.isFinite(momChange) && momChange < 0) insights.push(t("insights.momNegative", { value: asPct(momChange) }));

  return {
    metrics,
    lineRanges,
    barRanges,
    monthlyBars,
    pieData: (data?.pie ?? []).map((item, index) => ({
      name: item.name,
      value: toNum0(item.value),
      color: ["#0B5FFF", "#0E9384", "#F59E0B", "#D92D20", "#7C3AED", "#0891B2", "#4F46E5", "#64748B"][index % 8],
    })),
    overdueItems,
    upcomingItems,
    counts: data?.counts ?? { overdue_items: overdueItems.length, next7_items: 0, next30_items: 0 },
    largestOverduePay,
    largestOverdueRec,
    insights,
    summary: {
      totalIn,
      totalOutAbs,
      totalNet,
      settlementRate,
      mtdIn,
      mtdOut,
      mtdNet,
      trendDelta,
      avgMonthlyOutflowAbs,
      runwayMonths,
      consolidatedBalance: totalConsolidatedBalance,
    },
  };
}

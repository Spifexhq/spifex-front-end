/* --------------------------------------------------------------------------
 * File: src/pages/Reports/index.tsx
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
} from "recharts";

import Button from "@/shared/ui/Button";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import CumulativeAreaChart from "src/components/Charts";

import { api } from "@/api/requests";
import { useTranslation } from "react-i18next";
import { formatDateFromISO } from "@/lib";
import { formatCurrency } from "@/lib/currency/formatCurrency";

import type { ReportsSummary } from "@/models/components/reports";
import type { GetBanksTableResponse } from "@/models/settings/banking";

/* -------------------------------------------------------------------------- */
/* Types                                                                        */
/* -------------------------------------------------------------------------- */

type TipDatum = {
  value?: number | string;
  name?: string;
  color?: string;
};

type MinimalTipProps = {
  active?: boolean;
  payload?: TipDatum[];
  label?: string | number;
  title?: string;
};

/* -------------------------------------------------------------------------- */
/* Constants                                                                    */
/* -------------------------------------------------------------------------- */

const START_DATE = dayjs().startOf("month").subtract(12, "month").format("YYYY-MM-DD");
const END_DATE = dayjs().startOf("month").add(11, "month").endOf("month").format("YYYY-MM-DD");

const TX_DEBIT = -1; // Pagar
const TX_CREDIT = 1; // Receber

const C_POS = "#0B5FFF";
const C_NEG = "#D92D20";
const C_NET = "#0E9384";
const C_ACC = "#111827";
const C_GRID = "rgba(17,24,39,0.12)";

/* -------------------------------------------------------------------------- */
/* Money helpers                                                                */
/* -------------------------------------------------------------------------- */

const parseMoney = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = typeof v === "number" ? String(v) : String(v).trim();
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const toNum0 = (v: unknown) => parseMoney(v) ?? 0;

const fmtMoney = (v: unknown) => {
  const n = parseMoney(v);
  return n === null ? "—" : formatCurrency(n);
};

const asPct = (v: number) => `${(v * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                      */
/* -------------------------------------------------------------------------- */

const MinimalTip: React.FC<MinimalTipProps> = ({ active, payload = [], label, title }) => {
  if (!active || payload.length === 0) return null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        padding: "6px 8px",
        borderRadius: 6,
        fontSize: 12,
        color: "#111827",
      }}
      aria-live="polite"
    >
      {title ? <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div> : null}
      {label !== undefined ? <div style={{ color: "#6B7280", marginBottom: 4 }}>{label}</div> : null}

      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              width: 10,
              height: 10,
              background: p.color || "#9CA3AF",
              borderRadius: 2,
            }}
          />
          <span style={{ color: "#374151" }}>{p.name ?? ""}:</span>
          <span className="tabular-nums">
            {typeof p.value === "number" ? formatCurrency(p.value) : fmtMoney(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                          */
/* -------------------------------------------------------------------------- */

const ReportsPage: React.FC = () => {
  const { t } = useTranslation(["reports"]);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const [data, setData] = useState<ReportsSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [banksError, setBanksError] = useState<string | null>(null);

  const [totalConsolidatedBalance, setTotalConsolidatedBalance] = useState<number>(0);

  const params = useMemo(() => ({ date_from: START_DATE, date_to: END_DATE }), []);
  const periodLabel = useMemo(
    () => `${dayjs(START_DATE).format("MMM/YY")} → ${dayjs(END_DATE).format("MMM/YY")}`,
    []
  );

  const fetchBanksTotal = useCallback(async () => {
    setBanksError(null);
    setLoadingBanks(true);

    try {
      // POST payload; ids omitted/[] => backend returns all banks (subject to active)
      const res = await api.getBanksTable({ active: true, ids: [] });
      const payload = res.data as GetBanksTableResponse;

      const total = parseMoney(payload?.total_consolidated_balance) ?? 0;
      setTotalConsolidatedBalance(total);
    } catch (e) {
      console.error(e);
      setTotalConsolidatedBalance(0);
      setBanksError(t("errors.fetchBanksTotal"));
    } finally {
      setLoadingBanks(false);
    }
  }, [t]);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const [reportsRes] = await Promise.all([api.getReportsSummary(params), fetchBanksTotal()]);
      setData(reportsRes.data);
    } catch (e) {
      console.error(e);
      setError(t("errors.fetch"));
    } finally {
      setLoading(false);
    }
  }, [params, t, fetchBanksTotal]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const isBusy = loading || loadingBanks;

  /* ------------------------------ Derived data ----------------------------- */

  const derived = useMemo(() => {
    const d = data;

    const totalsIn = d?.totals.in ?? 0;
    const totalsOutAbs = d?.totals.out_abs ?? 0;
    const totalsNet = d?.totals.net ?? 0;
    const settlementRate = d?.totals.settlement_rate ?? 0;

    const mtdIn = d?.mtd.in ?? 0;
    const mtdOut = d?.mtd.out ?? 0;
    const mtdNet = d?.mtd.net ?? 0;

    const momInfinite = d?.mom.infinite ?? false;
    const momChange = momInfinite ? Infinity : (d?.mom.change ?? 0);

    const overdueRec = d?.overdue.rec ?? 0;
    const overduePay = d?.overdue.pay ?? 0;

    const next7Rec = d?.next7.rec ?? 0;
    const next7Pay = d?.next7.pay ?? 0;

    const next30Rec = d?.next30.rec ?? 0;
    const next30Pay = d?.next30.pay ?? 0;

    const monthlyBars = (d?.monthly.bars ?? []).map((x) => ({
      key: x.key,
      month: x.month,
      inflow: toNum0(x.inflow),
      outflow: toNum0(x.outflow),
      net: toNum0(x.net),
    }));

    const monthlyCumulative = (d?.monthly.cumulative ?? []).map((x) => ({
      key: x.key,
      month: x.month,
      cumulative: toNum0(x.cumulative),
    }));

    const pieData = (d?.pie ?? []).map((p) => ({
      name: p.name,
      value: toNum0(p.value),
    }));

    const overdueItems = (d?.overdue_items ?? []).map((it) => ({
      ...it,
      date: formatDateFromISO(it.date),
      amount: toNum0(it.amount),
      tx_type: typeof it.tx_type === "number" ? it.tx_type : Number(it.tx_type),
    }));

    const avgMonthlyOutflowAbs =
      monthlyBars.length === 0
        ? 0
        : monthlyBars.reduce((acc, x) => acc + Math.abs(x.outflow), 0) / monthlyBars.length;

    const runwayMonths =
      avgMonthlyOutflowAbs > 0 ? toNum0(totalConsolidatedBalance) / avgMonthlyOutflowAbs : Infinity;

    return {
      totalsIn,
      totalsOutAbs,
      totalsNet,
      settlementRate,
      mtdIn,
      mtdOut,
      mtdNet,
      momChange,
      overdueRec,
      overduePay,
      next7Rec,
      next7Pay,
      next30Rec,
      next30Pay,
      monthlyBars,
      monthlyCumulative,
      pieData,
      overdueItems,
      avgMonthlyOutflowAbs,
      runwayMonths,
    };
  }, [data, totalConsolidatedBalance]);

  const insights = useMemo(() => {
    const lines: string[] = [];

    if (Number.isFinite(derived.runwayMonths) && derived.runwayMonths < 3) lines.push(t("insights.runwayLow"));
    else if (Number.isFinite(derived.runwayMonths) && derived.runwayMonths >= 6) lines.push(t("insights.runwayHigh"));

    if (toNum0(derived.mtdNet) < 0) lines.push(t("insights.mtdNegative"));
    else if (toNum0(derived.mtdNet) > 0) lines.push(t("insights.mtdPositive"));

    if (toNum0(derived.overduePay) > toNum0(derived.overdueRec)) lines.push(t("insights.overduePressure"));
    else if (toNum0(derived.overdueRec) > 0) lines.push(t("insights.overdueReceivables"));

    if (Number.isFinite(derived.momChange) && derived.momChange !== 0) {
      const sign = derived.momChange >= 0 ? "+" : "";
      lines.push(t("insights.mom", { value: `${sign}${asPct(derived.momChange)}` }));
    }

    return lines;
  }, [derived, t]);

  const cardCls = "border border-gray-300 rounded-md bg-white px-3 py-2";

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      <main className="flex-1 transition-all duration-300">
        <TopProgress active={isBusy} variant="top" topOffset={64} />

        <div className="mt-[15px] mb-[15px] w-full px-6 md:px-10 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>
            <div className="flex gap-2">
              <Button variant="common" onClick={fetchData} disabled={isBusy}>
                {t("buttons.refresh")}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && banksError && <p className="text-sm text-red-600">{banksError}</p>}

          {isBusy && !error && !data && <p className="text-sm text-gray-600">{t("loading")}</p>}

          {!isBusy && !error && data && (
            <>
              {/* KPI Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.consolidatedBalance")}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">
                    {fmtMoney(totalConsolidatedBalance)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.bankSum")}</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.inPeriod")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_POS }}>
                    {fmtMoney(derived.totalsIn)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{periodLabel}</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.outPeriod")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_NEG }}>
                    -{fmtMoney(derived.totalsOutAbs)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{periodLabel}</p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.netPeriod")}</p>
                    <span
                      className={`text-[11px] ${
                        Number.isFinite(derived.momChange)
                          ? derived.momChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {t("kpis.mom")}{" "}
                      {Number.isFinite(derived.momChange)
                        ? (derived.momChange >= 0 ? "+" : "") + asPct(derived.momChange)
                        : "—"}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-lg font-semibold tabular-nums ${
                      toNum0(derived.totalsNet) >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {toNum0(derived.totalsNet) >= 0 ? "+" : ""}
                    {fmtMoney(derived.totalsNet)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{periodLabel}</p>
                </div>
              </section>

              {/* Operational KPIs */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.mtdIn")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_POS }}>
                    {fmtMoney(derived.mtdIn)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.currentMonth")}</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.mtdOut")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_NEG }}>
                    -{fmtMoney(derived.mtdOut)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.currentMonth")}</p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.mtdNet")}</p>
                    <span className="text-[11px] text-gray-500">
                      {t("kpis.mom")}{" "}
                      {Number.isFinite(derived.momChange)
                        ? (toNum0(derived.mtdNet) >= 0 ? "+" : "") + asPct(Math.abs(derived.momChange))
                        : "—"}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-lg font-semibold tabular-nums ${
                      toNum0(derived.mtdNet) >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {toNum0(derived.mtdNet) >= 0 ? "+" : ""}
                    {fmtMoney(derived.mtdNet)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {t("kpis.in")} {fmtMoney(derived.mtdIn)} • {t("kpis.out")} -{fmtMoney(derived.mtdOut)}
                  </p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.settlementRate")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{asPct(derived.settlementRate)}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.loadedUniverse")}</p>
                </div>
              </section>

              {/* Short-term alerts */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("alerts.overdueTitle")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toReceive")}</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">{fmtMoney(derived.overdueRec)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {fmtMoney(derived.overduePay)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("alerts.next7")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toReceive")}</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">{fmtMoney(derived.next7Rec)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {fmtMoney(derived.next7Pay)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("alerts.next30")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toReceive")}</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">{fmtMoney(derived.next30Rec)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {fmtMoney(derived.next30Pay)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Runway + cumulative */}
              <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("runway.avgOutflow")}</p>
                  <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                    -{fmtMoney(derived.avgMonthlyOutflowAbs)}
                  </p>
                  <p className="mt-2 text-[11px] text-gray-600">{t("runway.estimated")}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {Number.isFinite(derived.runwayMonths)
                      ? t("runway.months", { value: derived.runwayMonths.toFixed(1) })
                      : "—"}
                  </p>
                </div>

                <div className="xl:col-span-2 border border-gray-300 rounded-md bg-white px-3 py-2">
                  <CumulativeAreaChart data={derived.monthlyCumulative} title={t("charts.cumulativeTitle")} height={256} />
                </div>
              </section>

              {/* Bars: inflow vs outflow vs net */}
              <section className="border border-gray-300 rounded-md bg-white px-3 py-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-medium">{t("charts.barsTitle")}</p>
                  <span className="text-[11px] text-gray-500">{periodLabel}</span>
                </div>

                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={derived.monthlyBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} />
                      <XAxis dataKey="month" tick={{ fill: C_ACC, fontSize: 12 }} />
                      <YAxis tick={{ fill: C_ACC, fontSize: 12 }} tickFormatter={(v: number) => formatCurrency(v)} />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <MinimalTip
                            active={active}
                            payload={payload as unknown as TipDatum[]}
                            label={label}
                            title={t("charts.barsTitle")}
                          />
                        )}
                        cursor={{ fill: "#F3F4F6", opacity: 0.6 }}
                      />
                      <Legend />
                      <Bar dataKey="inflow" name={t("charts.inflow")} radius={[4, 4, 0, 0]} fill={C_POS} />
                      <Bar dataKey="outflow" name={t("charts.outflow")} radius={[4, 4, 0, 0]} fill={C_NEG} />
                      <Line type="monotone" dataKey="net" name={t("charts.net")} stroke={C_NET} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Pie + overdue table */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="border border-gray-300 rounded-md bg-white px-3 py-2">
                  <p className="text-[12px] font-medium mb-3">{t("charts.pieTitle")}</p>
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          content={({ active, payload, label }) => (
                            <MinimalTip
                              active={active}
                              payload={payload as unknown as TipDatum[]}
                              label={label}
                              title={t("charts.pieTitle")}
                            />
                          )}
                        />
                        <Legend />
                        <Pie data={derived.pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border border-gray-300 rounded-md bg-white px-3 py-2 overflow-hidden">
                  <p className="text-[12px] font-medium mb-3">{t("tables.overdueTitle")}</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-3 py-2">{t("tables.date")}</th>
                          <th className="text-left px-3 py-2">{t("tables.description")}</th>
                          <th className="text-center px-3 py-2">{t("tables.type")}</th>
                          <th className="text-right px-3 py-2">{t("tables.amount")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {derived.overdueItems.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                              {t("tables.noOverdue")}
                            </td>
                          </tr>
                        )}

                        {derived.overdueItems.map((it) => {
                          const isPay = it.tx_type === TX_DEBIT;
                          const isReceive = it.tx_type === TX_CREDIT;

                          return (
                            <tr key={String(it.id)} className="border-t">
                              <td className="px-3 py-2">{it.date}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{it.desc}</td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs ${
                                    isPay ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                  }`}
                                  title={String(it.tx_type)}
                                >
                                  {isPay ? t("tables.payLabel") : isReceive ? t("tables.receiveLabel") : String(it.tx_type)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(it.amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Insights */}
              {insights.length > 0 && (
                <section className="border border-gray-300 rounded-md bg-white px-3 py-2">
                  <p className="text-[12px] font-medium mb-2">{t("insights.title")}</p>
                  <ul className="list-disc pl-5 text-[13px] text-gray-700 space-y-1">
                    {insights.map((txt, i) => (
                      <li key={i}>{txt}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;

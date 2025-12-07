// src/pages/Reports/index.tsx
// ✅ treat API money as decimal (string/number) — no /100
// ✅ no need to define currency or locale — formatCurrency handles it

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import Button from "src/components/ui/Button";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import CumulativeAreaChart from "@/components/charts/CumulativeAreaChart";

import { api } from "@/api/requests";
import { useBanks } from "@/hooks/useBanks";
import type { ReportsSummary } from "@/models/entries/domain";
import { useTranslation } from "react-i18next";
import { formatDateFromISO } from "src/lib";
import { formatCurrency } from "@/lib/currency/formatCurrency";

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
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const startDate = dayjs()
  .startOf("month")
  .subtract(12, "month")
  .format("YYYY-MM-DD");
const endDate = dayjs()
  .startOf("month")
  .add(11, "month")
  .endOf("month")
  .format("YYYY-MM-DD");

const parseMoney = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = typeof v === "number" ? String(v) : String(v).trim();
  const n = Number(s.replace(",", ".")); // backend should be "1234.56"
  return Number.isFinite(n) ? n : null;
};

const fmtMoney = (v: unknown) => {
  const n = parseMoney(v);
  return n === null ? "—" : formatCurrency(n);
};

const asPct = (v: number) => `${(v * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

const C_POS = "#0B5FFF";
const C_NEG = "#D92D20";
const C_NET = "#0E9384";
const C_ACC = "#111827";
const C_GRID = "rgba(17,24,39,0.12)";

/* Custom tooltip (minimal) */
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
      {label !== undefined ? (
        <div style={{ color: "#6B7280", marginBottom: 4 }}>{label}</div>
      ) : null}

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
            {typeof p.value === "number"
              ? formatCurrency(p.value)
              : fmtMoney(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const ReportsPage: React.FC = () => {
  const { t } = useTranslation(["reports"]);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks();

  const params = useMemo(() => ({ date_from: startDate, date_to: endDate }), []);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.getReportsSummary(params);
      setData(res.data);
    } catch (e) {
      console.error(e);
      setError(t("errors.fetch"));
    } finally {
      setLoading(false);
    }
  }, [params, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /* ------------------------------ Derived data ----------------------------- */

  const totalsIn = data?.totals.in ?? 0;
  const totalsOutAbs = data?.totals.out_abs ?? 0;
  const totalsNet = data?.totals.net ?? 0;
  const settlementRate = data?.totals.settlement_rate ?? 0;

  const mtdIn = data?.mtd.in ?? 0;
  const mtdOut = data?.mtd.out ?? 0;
  const mtdNet = data?.mtd.net ?? 0;

  const momInfinite = data?.mom.infinite ?? false;
  const momChange = momInfinite ? Infinity : (data?.mom.change ?? 0);

  const overdueRec = data?.overdue.rec ?? 0;
  const overduePay = data?.overdue.pay ?? 0;

  const next7Rec = data?.next7.rec ?? 0;
  const next7Pay = data?.next7.pay ?? 0;
  const next30Rec = data?.next30.rec ?? 0;
  const next30Pay = data?.next30.pay ?? 0;

  // ✅ already decimals from API
  const monthlyBars = (data?.monthly.bars ?? []).map((d) => ({
    key: d.key,
    month: d.month,
    inflow: Number(d.inflow || 0),
    outflow: Number(d.outflow || 0),
    net: Number(d.net || 0),
  }));

  const monthlyCumulative = (data?.monthly.cumulative ?? []).map((d) => ({
    key: d.key,
    month: d.month,
    cumulative: Number(d.cumulative || 0),
  }));

  const pieData = (data?.pie ?? []).map((p) => ({
    name: p.name,
    value: Number(p.value || 0),
  }));

  const overdueItems = (data?.overdue_items ?? []).map((it) => ({
    ...it,
    date: formatDateFromISO(it.date),
    amount: Number(it.amount || 0),
  }));

  const avgMonthlyOutflowAbs =
    monthlyBars.length === 0
      ? 0
      : monthlyBars.reduce((acc, x) => acc + Math.abs(x.outflow || 0), 0) / monthlyBars.length;

  const runwayMonths =
    avgMonthlyOutflowAbs > 0
      ? Number(totalConsolidatedBalance ?? 0) / avgMonthlyOutflowAbs
      : Infinity;

  const insights = useMemo(() => {
    const lines: string[] = [];

    if (Number.isFinite(runwayMonths) && runwayMonths < 3) lines.push(t("insights.runwayLow"));
    else if (Number.isFinite(runwayMonths) && runwayMonths >= 6) lines.push(t("insights.runwayHigh"));

    if (mtdNet < 0) lines.push(t("insights.mtdNegative"));
    else if (mtdNet > 0) lines.push(t("insights.mtdPositive"));

    if (overduePay > overdueRec) lines.push(t("insights.overduePressure"));
    else if (overdueRec > 0) lines.push(t("insights.overdueReceivables"));

    if (Number.isFinite(momChange) && momChange !== 0) {
      const sign = momChange >= 0 ? "+" : "";
      lines.push(t("insights.mom", { value: `${sign}${asPct(momChange)}` }));
    }

    return lines;
  }, [runwayMonths, mtdNet, overduePay, overdueRec, momChange, t]);

  const cardCls = "border border-gray-300 rounded-md bg-white px-3 py-2";

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      <main className={"flex-1 transition-all duration-300"}>
        <TopProgress active={loading || loadingBanks} variant="top" topOffset={64} />

        <div className="mt-[15px] mb-[15px] w-full px-6 md:px-10 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-semibold">{t("title")}</h1>
            <div className="flex gap-2">
              <Button variant="common" onClick={fetchData}>
                {t("buttons.refresh")}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !loadingBanks && !error && data && (
            <>
              {/* KPI Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">
                    {t("kpis.consolidatedBalance")}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">
                    {fmtMoney(totalConsolidatedBalance ?? 0)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.bankSum")}</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.inPeriod")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_POS }}>
                    {fmtMoney(totalsIn)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.outPeriod")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_NEG }}>
                    -{fmtMoney(totalsOutAbs)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.netPeriod")}</p>
                    <span
                      className={`text-[11px] ${
                        Number.isFinite(momChange)
                          ? momChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {t("kpis.mom")}{" "}
                      {Number.isFinite(momChange) ? (momChange >= 0 ? "+" : "") + asPct(momChange) : "—"}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-lg font-semibold tabular-nums ${
                      totalsNet >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {totalsNet >= 0 ? "+" : ""}
                    {fmtMoney(totalsNet)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </p>
                </div>
              </section>

              {/* KPIs Operacionais */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.mtdIn")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_POS }}>
                    {fmtMoney(mtdIn)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.currentMonth")}</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.mtdOut")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_NEG }}>
                    -{fmtMoney(mtdOut)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.currentMonth")}</p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.mtdNet")}</p>
                    <span className="text-[11px] text-gray-500">
                      {t("kpis.mom")}{" "}
                      {Number.isFinite(momChange)
                        ? (mtdNet >= 0 ? "+" : "") + asPct(Math.abs(momChange))
                        : "—"}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-lg font-semibold tabular-nums ${
                      mtdNet >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {mtdNet >= 0 ? "+" : ""}
                    {fmtMoney(mtdNet)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {t("kpis.in")} {fmtMoney(mtdIn)} • {t("kpis.out")} -{fmtMoney(mtdOut)}
                  </p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.settlementRate")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{asPct(settlementRate)}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.loadedUniverse")}</p>
                </div>
              </section>

              {/* Alertas de Curto Prazo */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("alerts.overdueTitle")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toReceive")}</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">{fmtMoney(overdueRec)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {fmtMoney(overduePay)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("alerts.next7")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toReceive")}</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">{fmtMoney(next7Rec)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {fmtMoney(next7Pay)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("alerts.next30")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toReceive")}</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">{fmtMoney(next30Rec)}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {fmtMoney(next30Pay)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Runway + Acumulado */}
              <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("runway.avgOutflow")}</p>
                  <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                    -{fmtMoney(avgMonthlyOutflowAbs)}
                  </p>
                  <p className="mt-2 text-[11px] text-gray-600">{t("runway.estimated")}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {Number.isFinite(runwayMonths) ? t("runway.months", { value: runwayMonths.toFixed(1) }) : "—"}
                  </p>
                </div>

                <div className="xl:col-span-2 border border-gray-300 rounded-md bg-white px-3 py-2">
                  <CumulativeAreaChart
                    data={monthlyCumulative}
                    title={t("charts.cumulativeTitle")}
                    height={256}
                  />
                </div>
              </section>

              {/* Barras Entradas x Saídas x Resultado */}
              <section className="border border-gray-300 rounded-md bg-white px-3 py-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-medium">{t("charts.barsTitle")}</p>
                  <span className="text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </span>
                </div>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} />
                      <XAxis dataKey="month" tick={{ fill: C_ACC, fontSize: 12 }} />
                      <YAxis
                        tick={{ fill: C_ACC, fontSize: 12 }}
                        tickFormatter={(v: number) => formatCurrency(v)}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <MinimalTip
                            active={active}
                            payload={payload as TipDatum[]}
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
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Pizza + Tabela Atrasos */}
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
                              payload={payload as TipDatum[]}
                              label={label}
                              title={t("charts.pieTitle")}
                            />
                          )}
                        />
                        <Legend />
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                          {pieData.map((_, i) => (
                            <Cell key={i} />
                          ))}
                        </Pie>
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
                        {overdueItems.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                              {t("tables.noOverdue")}
                            </td>
                          </tr>
                        )}
                        {overdueItems.map((it) => (
                          <tr key={String(it.id)} className="border-t">
                            <td className="px-3 py-2">{it.date}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{it.desc}</td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  it.type === t("tables.payLabel")
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {it.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {fmtMoney(it.amount)}
                            </td>
                          </tr>
                        ))}
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

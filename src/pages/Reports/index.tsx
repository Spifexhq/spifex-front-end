// src/pages/Reports/index.tsx
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
  locale: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const startDate = dayjs().startOf("month").subtract(12, "month").format("YYYY-MM-DD");
const endDate   = dayjs().startOf("month").add(11, "month").endOf("month").format("YYYY-MM-DD");

const BRL = (v: number, locale = "pt-BR") =>
  v.toLocaleString(locale, { style: "currency", currency: "BRL" });

const asPct = (v: number, locale = "pt-BR") =>
  `${(v * 100).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;

const C_POS = "#0B5FFF";
const C_NEG = "#D92D20";
const C_NET = "#0E9384";
const C_ACC = "#111827";
const C_GRID = "rgba(17,24,39,0.12)";

/* Custom tooltip (minimal) */
const MinimalTip: React.FC<MinimalTipProps> = ({ active, payload = [], label, title, locale }) => {
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
          <span style={{ width: 10, height: 10, background: p.color || "#9CA3AF", borderRadius: 2 }} />
          <span style={{ color: "#374151" }}>{p.name ?? ""}:</span>
          <span className="tabular-nums">
            {typeof p.value === "number" ? BRL(p.value, locale) : String(p.value ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
};


const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports"]);
  const locale = i18n.language === "pt" ? "pt-BR" : i18n.language;

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks();

  const params = useMemo(
    () => ({ date_from: startDate, date_to: endDate }),
    []
  );

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

  const totalsInMinor       = data?.totals.in_minor ?? 0;
  const totalsOutAbsMinor   = data?.totals.out_abs_minor ?? 0;
  const totalsNetMinor      = data?.totals.net_minor ?? 0;
  const settlementRate      = data?.totals.settlement_rate ?? 0;

  const mtdInMinor          = data?.mtd.in_minor ?? 0;
  const mtdOutMinor         = data?.mtd.out_minor ?? 0;
  const mtdNetMinor         = data?.mtd.net_minor ?? 0;

  const momInfinite         = data?.mom.infinite ?? false;
  const momChange           = momInfinite ? Infinity : (data?.mom.change ?? 0);

  const overdueRecMinor     = data?.overdue.rec_minor ?? 0;
  const overduePayMinor     = data?.overdue.pay_minor ?? 0;

  const next7RecMinor       = data?.next7.rec_minor ?? 0;
  const next7PayMinor       = data?.next7.pay_minor ?? 0;
  const next30RecMinor      = data?.next30.rec_minor ?? 0;
  const next30PayMinor      = data?.next30.pay_minor ?? 0;

  const monthlyBars = (data?.monthly.bars ?? []).map(d => ({
    key: d.key,
    month: d.month,
    inflow: d.inflow_minor / 100,
    outflow: d.outflow_minor / 100,
    net: d.net_minor / 100,
  }));

  const monthlyCumulative = (data?.monthly.cumulative ?? []).map(d => ({
    key: d.key,
    month: d.month,
    cumulative: d.cumulative_minor / 100,
  }));

  const pieData = (data?.pie ?? []).map(p => ({ name: p.name, value: p.value_minor / 100 }));

  const overdueItems = (data?.overdue_items ?? []).map(it => ({
    ...it,
    amount: it.amount_minor / 100,
  }));

  const avgMonthlyOutflowAbs =
    monthlyBars.length === 0
      ? 0
      : monthlyBars.reduce((acc, x) => acc + (x.outflow || 0), 0) / monthlyBars.length;

  const runwayMonths =
    avgMonthlyOutflowAbs > 0
      ? (totalConsolidatedBalance ?? 0) / avgMonthlyOutflowAbs
      : Infinity;

  const insights = useMemo(() => {
    const lines: string[] = [];

    if (Number.isFinite(runwayMonths) && runwayMonths < 3) {
      lines.push(t("insights.runwayLow"));
    } else if (Number.isFinite(runwayMonths) && runwayMonths >= 6) {
      lines.push(t("insights.runwayHigh"));
    }

    if (mtdNetMinor < 0) {
      lines.push(t("insights.mtdNegative"));
    } else if (mtdNetMinor > 0) {
      lines.push(t("insights.mtdPositive"));
    }

    if (overduePayMinor > overdueRecMinor) {
      lines.push(t("insights.overduePressure"));
    } else if (overdueRecMinor > 0) {
      lines.push(t("insights.overdueReceivables"));
    }

    if (Number.isFinite(momChange) && momChange !== 0) {
      const sign = momChange >= 0 ? "+" : "";
      lines.push(t("insights.mom", { value: `${sign}${asPct(momChange, locale)}` }));
    }

    return lines;
  }, [runwayMonths, mtdNetMinor, overduePayMinor, overdueRecMinor, momChange, t, locale]);

  const cardCls = "border border-gray-300 rounded-md bg-white px-3 py-2";

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      <main className={"flex-1 transition-all duration-300"}>
        <TopProgress active={loading || loadingBanks} variant="top" topOffset={64} />
        <div className="mt-[15px] w-full px-6 md:px-10 space-y-6">
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
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.consolidatedBalance")}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">
                    {BRL(totalConsolidatedBalance ?? 0, locale)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.bankSum")}</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.inPeriod")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_POS }}>
                    {BRL(totalsInMinor / 100, locale)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.outPeriod")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_NEG }}>
                    -{BRL(totalsOutAbsMinor / 100, locale)}
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
                      {Number.isFinite(momChange) ? (momChange >= 0 ? "+" : "") + asPct(momChange, locale) : "—"}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-lg font-semibold tabular-nums ${
                      totalsNetMinor >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {totalsNetMinor >= 0 ? "+" : ""}
                    {BRL(totalsNetMinor / 100, locale)}
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
                    {BRL(mtdInMinor / 100, locale)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.currentMonth")}</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.mtdOut")}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: C_NEG }}>
                    -{BRL(mtdOutMinor / 100, locale)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{t("kpis.currentMonth")}</p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.mtdNet")}</p>
                    <span className="text-[11px] text-gray-500">
                      {t("kpis.mom")}{" "}
                      {Number.isFinite(momChange) ? (mtdNetMinor >= 0 ? "+" : "") + asPct(Math.abs(momChange), locale) : "—"}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-lg font-semibold tabular-nums ${
                      mtdNetMinor >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {mtdNetMinor >= 0 ? "+" : ""}
                    {BRL(mtdNetMinor / 100, locale)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {t("kpis.in")} {BRL(mtdInMinor / 100, locale)} • {t("kpis.out")} -{BRL(mtdOutMinor / 100, locale)}
                  </p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">{t("kpis.settlementRate")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{asPct(settlementRate, locale)}</p>
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
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">
                        {BRL(overdueRecMinor / 100, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {BRL(overduePayMinor / 100, locale)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("alerts.next7")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toReceive")}</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">
                        {BRL(next7RecMinor / 100, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {BRL(next7PayMinor / 100, locale)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">{t("alerts.next30")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toReceive")}</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">
                        {BRL(next30RecMinor / 100, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">{t("alerts.toPay")}</p>
                      <p className="text-lg font-semibold" style={{ color: C_NEG }}>
                        {BRL(next30PayMinor / 100, locale)}
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
                    -{BRL(avgMonthlyOutflowAbs, locale)}
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
                    locale={locale}
                    currency="BRL"
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
                        tickFormatter={(v: number) =>
                          v.toLocaleString(locale, {
                            style: "currency",
                            currency: "BRL",
                            minimumFractionDigits: 0,
                          })
                        }
                      />
                      <Tooltip
                        content={({ active, payload, label }) => (
                          <MinimalTip active={active} payload={payload} label={label} title={t("charts.barsTitle")} locale={locale} />
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
                            <MinimalTip active={active} payload={payload} label={label} title={t("charts.pieTitle")} locale={locale} />
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
                              {BRL(it.amount, locale)}
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

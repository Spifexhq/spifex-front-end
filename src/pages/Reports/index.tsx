// src/pages/Reports/index.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import Navbar from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import Button from "@/components/Button";
import { InlineLoader } from "@/components/Loaders";

import { api } from "@/api/requests";
import { useBanks } from "@/hooks/useBanks";
import type { RootState } from "@/redux/rootReducer";
import type { ReportsSummary } from "@/models/entries/domain";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const startDate = dayjs().startOf("month").subtract(12, "month").format("YYYY-MM-DD");
const endDate   = dayjs().startOf("month").add(11, "month").endOf("month").format("YYYY-MM-DD");

const currencyBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const POS_BAR = "#1E3A8A";
const NEG_BAR = "#991B1B";

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

const ReportsPage: React.FC = () => {
  useEffect(() => {
    document.title = "Relatórios";
  }, []);

  // Mesmo padrão do KpiRow para pegar orgExternalId com fallback
  const orgExternalId = useSelector((s: RootState) =>
    s.auth.orgExternalId ??
    s.auth.organization?.organization?.external_id ??
    s.auth.organization?.external_id
  ) as string | undefined;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Saldo consolidado (para runway)
  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks();

  const params = useMemo(
    () => ({
      date_from: startDate,
      date_to: endDate,
    }),
    []
  );

  useEffect(() => {
    if (!orgExternalId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.getReportsSummary(orgExternalId, params);
        setData(res.data);
      } catch (e) {
        console.error(e);
        setError("Erro ao buscar dados do relatório.");
      } finally {
        setLoading(false);
      }
    })();
  }, [orgExternalId, params]);

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
      lines.push("Runway estimada abaixo de 3 meses. Considere reduzir saídas ou reforçar caixa.");
    } else if (Number.isFinite(runwayMonths) && runwayMonths >= 6) {
      lines.push("Runway confortável (≥ 6 meses). Avalie antecipar investimentos com critério.");
    }

    if (mtdNetMinor < 0) {
      lines.push("Resultado do mês negativo. Revise a pizza de despesas para atacar maiores categorias.");
    } else if (mtdNetMinor > 0) {
      lines.push("Resultado do mês positivo. Monitore recebimentos previstos para manter o ritmo.");
    }

    if (overduePayMinor > overdueRecMinor) {
      lines.push("Pagamentos vencidos > recebimentos vencidos — risco de pressão de caixa no curtíssimo prazo.");
    } else if (overdueRecMinor > 0) {
      lines.push("Há recebimentos vencidos relevantes. Foque a cobrança nos top 10 atrasos.");
    }

    if (Number.isFinite(momChange) && momChange !== 0) {
      lines.push(`Variação M/M do resultado do mês: ${(momChange >= 0 ? "+" : "")}${pct(momChange)}.`);
    }

    return lines;
  }, [runwayMonths, mtdNetMinor, overduePayMinor, overdueRecMinor, momChange]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(p => !p), []);

  const cardCls = "border border-gray-300 rounded-md bg-white px-3 py-2 shadow-none";

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      <Navbar />
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={() => {}}
        handleOpenTransferenceModal={() => {}}
        mode="default"
      />

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-16"}`}>
        <div className="mt-[80px] w/full px-6 md:px-10 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Relatórios de Fluxo de Caixa</h1>
            <div className="flex gap-2">
              <Button variant="common" onClick={() => window.location.reload()}>
                Atualizar
              </Button>
            </div>
          </div>

          {(loading || loadingBanks) && (
            <div className="flex items-center gap-3 text-sm">
              <InlineLoader color="orange" className="w-8 h-8" />
              <span className="text-gray-600">Carregando dados do relatório…</span>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !loadingBanks && !error && data && (
            <>
              {/* KPI Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">Saldo consolidado</p>
                  <p className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">
                    {currencyBRL(totalConsolidatedBalance ?? 0)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Somatório de contas bancárias</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">Entradas (período)</p>
                  <p className="mt-1 text-lg font-semibold text-green-700 tabular-nums">
                    {currencyBRL(totalsInMinor / 100)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">Saídas (período)</p>
                  <p className="mt-1 text-lg font-semibold text-red-700 tabular-nums">
                    -{currencyBRL(totalsOutAbsMinor / 100)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600">Resultado (período)</p>
                    <span
                      className={`text-[11px] ${
                        Number.isFinite(momChange)
                          ? momChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      M/M {Number.isFinite(momChange) ? (momChange >= 0 ? "+" : "") + pct(momChange) : "—"}
                    </span>
                  </div>
                  <p className={`mt-1 text-lg font-semibold tabular-nums ${totalsNetMinor >= 0 ? "text-blue-900" : "text-red-700"}`}>
                    {totalsNetMinor >= 0 ? "+" : ""}
                    {currencyBRL(totalsNetMinor / 100)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </p>
                </div>
              </section>

              {/* KPIs Operacionais */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">MTD: Entradas</p>
                  <p className="mt-1 text-lg font-semibold text-green-700 tabular-nums">
                    {currencyBRL(mtdInMinor / 100)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Mês atual</p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">MTD: Saídas</p>
                  <p className="mt-1 text-lg font-semibold text-red-700 tabular-nums">
                    -{currencyBRL(mtdOutMinor / 100)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Mês atual</p>
                </div>

                <div className={cardCls}>
                  <div className="flex items-start justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-gray-600">MTD: Resultado</p>
                    <span className="text-[11px] text-gray-500">
                      M/M {Number.isFinite(momChange) ? (mtdNetMinor >= 0 ? "+" : "") + pct(Math.abs(momChange)) : "—"}
                    </span>
                  </div>
                  <p className={`mt-1 text-lg font-semibold tabular-nums ${mtdNetMinor >= 0 ? "text-blue-900" : "text-red-700"}`}>
                    {mtdNetMinor >= 0 ? "+" : ""}
                    {currencyBRL(mtdNetMinor / 100)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Entradas {currencyBRL(mtdInMinor / 100)} • Saídas -{currencyBRL(mtdOutMinor / 100)}
                  </p>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600">Taxa de liquidação</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{pct(settlementRate)}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">No universo carregado</p>
                </div>
              </section>

              {/* Alertas de Curto Prazo */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Vencidos (não liquidados)</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">A Receber</p>
                      <p className="text-lg font-semibold text-blue-900 tabular-nums">
                        {currencyBRL(overdueRecMinor / 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">A Pagar</p>
                      <p className="text-lg font-semibold text-red-700 tabular-nums">
                        {currencyBRL(overduePayMinor / 100)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Próximos 7 dias</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">A Receber</p>
                      <p className="text-lg font-semibold text-blue-900 tabular-nums">
                        {currencyBRL(next7RecMinor / 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">A Pagar</p>
                      <p className="text-lg font-semibold text-red-700 tabular-nums">
                        {currencyBRL(next7PayMinor / 100)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Próximos 30 dias</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[12px] text-gray-600">A Receber</p>
                      <p className="text-lg font-semibold text-blue-900 tabular-nums">
                        {currencyBRL(next30RecMinor / 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-600">A Pagar</p>
                      <p className="text-lg font-semibold text-red-700 tabular-nums">
                        {currencyBRL(next30PayMinor / 100)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Runway + Acumulado */}
              <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <div className={cardCls}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-600 mb-1">Média mensal de saídas</p>
                  <p className="text-lg font-semibold text-red-700 tabular-nums">-{currencyBRL(avgMonthlyOutflowAbs)}</p>
                  <p className="mt-2 text-[11px] text-gray-600">Runway estimada</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {Number.isFinite(runwayMonths) ? `${runwayMonths.toFixed(1)} mês(es)` : "—"}
                  </p>
                </div>

                <div className="xl:col-span-2 border border-gray-300 rounded-md bg-white px-3 py-2">
                  <p className="text-[12px] font-medium mb-3">Saldo acumulado (por competência)</p>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyCumulative}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="month" tick={{ fill: "#374151", fontSize: 12 }} />
                        <YAxis
                          tick={{ fill: "#374151", fontSize: 12 }}
                          tickFormatter={(v: number) =>
                            v.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              minimumFractionDigits: 0,
                            })
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => currencyBRL(value)}
                          labelFormatter={(label: string, payload) =>
                            payload?.[0]?.payload?.key
                              ? dayjs(payload[0].payload.key).format("MMMM/YYYY")
                              : label
                          }
                          contentStyle={{ backgroundColor: "#F9FAFB", border: "1px solid #D1D5DB", color: "#111827" }}
                        />
                        <Line type="monotone" dataKey="cumulative" dot={false} stroke="#1E3A8A" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* Barras Entradas x Saídas x Resultado */}
              <section className="border border-gray-300 rounded-md bg-white px-3 py-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-medium">Entradas x Saídas (mensal)</p>
                  <span className="text-[11px] text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </span>
                </div>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBars}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="month" tick={{ fill: "#374151", fontSize: 12 }} />
                      <YAxis
                        tick={{ fill: "#374151", fontSize: 12 }}
                        tickFormatter={(v: number) =>
                          v.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            minimumFractionDigits: 0,
                          })
                        }
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          currencyBRL(value),
                          name === "inflow" ? "Entradas" : name === "outflow" ? "Saídas" : "Resultado",
                        ]}
                        contentStyle={{ backgroundColor: "#F9FAFB", border: "1px solid #D1D5DB", color: "#111827" }}
                        cursor={{ fill: "#E5E7EB", opacity: 0.6 }}
                      />
                      <Legend />
                      <Bar dataKey="inflow" name="Entradas" radius={[4, 4, 0, 0]} fill={POS_BAR} />
                      <Bar dataKey="outflow" name="Saídas" radius={[4, 4, 0, 0]} fill={NEG_BAR} />
                      <Line type="monotone" dataKey="net" name="Resultado" stroke="#0F766E" strokeWidth={2} dot={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Pizza + Tabela Atrasos */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="border border-gray-300 rounded-md bg-white px-3 py-2">
                  <p className="text-[12px] font-medium mb-3">Distribuição de despesas por categoria</p>
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value: number) => currencyBRL(value)}
                          contentStyle={{ backgroundColor: "#F9FAFB", border: "1px solid #D1D5DB", color: "#111827" }}
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
                  <p className="text-[12px] font-medium mb-3">Top 10 lançamentos em atraso</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-3 py-2">Data</th>
                          <th className="text-left px-3 py-2">Descrição</th>
                          <th className="text-center px-3 py-2">Tipo</th>
                          <th className="text-right px-3 py-2">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueItems.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                              Nenhum lançamento em atraso
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
                                  it.type === "Pagar" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {it.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{currencyBRL(it.amount)}</td>
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
                  <p className="text-[12px] font-medium mb-2">Insights</p>
                  <ul className="list-disc pl-5 text-[13px] text-gray-700 space-y-1">
                    {insights.map((t, i) => (
                      <li key={i}>{t}</li>
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

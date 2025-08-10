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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import Navbar from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { InlineLoader } from "@/components/Loaders";
import Button from "@/components/Button";

import { api } from "@/api/requests";
import { useBanks } from "@/hooks/useBanks";

// Ajuste o tipo conforme seu modelo real
import type { Entry } from "@/models/entries";

const PAGE_SIZE = 10000;
const startDate = dayjs().startOf("month").subtract(12, "month").format("YYYY-MM-DD");
const endDate = dayjs().startOf("month").add(11, "month").endOf("month").format("YYYY-MM-DD");

const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const POS_BAR = "#1E3A8A"; // azul
const NEG_BAR = "#991B1B"; // vermelho

const Report: React.FC = () => {
  useEffect(() => {
    document.title = "Relatórios";
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // saldo consolidado para runway
  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks();

  const payload = useMemo(
    () => ({
      page_size: PAGE_SIZE,
      start_date: startDate,
      end_date: endDate,
    }),
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.getEntries(payload);
        setEntries(response.data?.results ?? []);
      } catch (e) {
        console.error("Failed to fetch entries", e);
        setError("Erro ao buscar lançamentos.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [payload]);

  // --------- Preparos comuns ----------
  const today = dayjs();

  const entriesParsed = useMemo(() => {
    return entries.map((e) => {
      const amount = parseFloat((e as any).amount as unknown as string);
      const isCredit = (e as any).transaction_type === "credit";
      const signed = isCredit ? amount : -amount;
      const due = dayjs((e as any).due_date);
      const settled = Boolean((e as any).settlement_state);
      return { raw: e, amount, isCredit, signed, due, settled };
    });
  }, [entries]);

  // --------- KPIs rápidos ----------
  const {
    totalInflow,
    totalOutflowAbs,
    netTotal,
    mtdInflow,
    mtdOutflowAbs,
    mtdNet,
    prevMonthNet,
    momChange,
    settlementRate,
    overdueReceivables,
    overduePayables,
    overdueReceivablesSum,
    overduePayablesSum,
    next7Payables,
    next7Receivables,
    next30Payables,
    next30Receivables,
    avgMonthlyOutflowAbs,
    runwayMonths,
  } = useMemo(() => {
    if (entriesParsed.length === 0) {
      return {
        totalInflow: 0,
        totalOutflowAbs: 0,
        netTotal: 0,
        mtdInflow: 0,
        mtdOutflowAbs: 0,
        mtdNet: 0,
        prevMonthNet: 0,
        momChange: 0,
        settlementRate: 0,
        overdueReceivables: 0,
        overduePayables: 0,
        overdueReceivablesSum: 0,
        overduePayablesSum: 0,
        next7Payables: 0,
        next7Receivables: 0,
        next30Payables: 0,
        next30Receivables: 0,
        avgMonthlyOutflowAbs: 0,
        runwayMonths: Infinity,
      };
    }

    let totalIn = 0;
    let totalOutAbs = 0;
    let settledCount = 0;

    const mStart = dayjs().startOf("month");
    const mEnd = dayjs().endOf("month");
    let mtdIn = 0;
    let mtdOutAbs = 0;

    const prevStart = dayjs().subtract(1, "month").startOf("month");
    const prevEnd = dayjs().subtract(1, "month").endOf("month");
    let prevNet = 0;

    // overdue / próximos
    let overdueRec = 0;
    let overduePay = 0;
    let overdueRecSum = 0;
    let overduePaySum = 0;

    let n7Pay = 0,
      n7Rec = 0,
      n30Pay = 0,
      n30Rec = 0;
    const in7 = today.add(7, "day");
    const in30 = today.add(30, "day");

    // para média de saídas mensais
    const monthlyAgg: Record<string, { in: number; outAbs: number }> = {};

    for (const r of entriesParsed) {
      if (r.isCredit) totalIn += r.amount;
      else totalOutAbs += r.amount;

      if (r.settled) settledCount += 1;

      // MTD
      if (r.due.isAfter(mStart.subtract(1, "day")) && r.due.isBefore(mEnd.add(1, "day"))) {
        if (r.isCredit) mtdIn += r.amount;
        else mtdOutAbs += r.amount;
      }

      // Prev month net
      if (r.due.isAfter(prevStart.subtract(1, "day")) && r.due.isBefore(prevEnd.add(1, "day"))) {
        prevNet += r.signed;
      }

      // Overdue (não liquidado e vencido)
      if (!r.settled && r.due.isBefore(today, "day")) {
        if (r.isCredit) {
          overdueRec += 1;
          overdueRecSum += r.amount;
        } else {
          overduePay += 1;
          overduePaySum += r.amount;
        }
      }

      // Próximos 7 / 30 dias
      if (!r.settled && r.due.isAfter(today.subtract(1, "day"))) {
        if (r.due.isBefore(in7.add(1, "day"))) {
          if (r.isCredit) n7Rec += r.amount;
          else n7Pay += r.amount;
        }
        if (r.due.isBefore(in30.add(1, "day"))) {
          if (r.isCredit) n30Rec += r.amount;
          else n30Pay += r.amount;
        }
      }

      // Agg mensal
      const key = r.due.startOf("month").format("YYYY-MM");
      if (!monthlyAgg[key]) monthlyAgg[key] = { in: 0, outAbs: 0 };
      if (r.isCredit) monthlyAgg[key].in += r.amount;
      else monthlyAgg[key].outAbs += r.amount;
    }

    const net = totalIn - totalOutAbs;
    const mtdNetV = mtdIn - mtdOutAbs;

    const mom =
      prevNet === 0 ? (mtdNetV === 0 ? 0 : Infinity) : (mtdNetV - prevNet) / Math.abs(prevNet);

    // média de saída mensal (somente meses com dados)
    const months = Object.keys(monthlyAgg);
    const avgOutAbs =
      months.length === 0
        ? 0
        : months.reduce((acc, k) => acc + monthlyAgg[k].outAbs, 0) / months.length;

    const runway =
      avgOutAbs > 0 ? (totalConsolidatedBalance ?? 0) / avgOutAbs : Infinity;

    return {
      totalInflow: totalIn,
      totalOutflowAbs: totalOutAbs,
      netTotal: net,
      mtdInflow: mtdIn,
      mtdOutflowAbs: mtdOutAbs,
      mtdNet: mtdNetV,
      prevMonthNet: prevNet,
      momChange: mom,
      settlementRate: settledCount / entriesParsed.length,
      overdueReceivables: overdueRec,
      overduePayables: overduePay,
      overdueReceivablesSum: overdueRecSum,
      overduePayablesSum: overduePaySum,
      next7Payables: n7Pay,
      next7Receivables: n7Rec,
      next30Payables: n30Pay,
      next30Receivables: n30Rec,
      avgMonthlyOutflowAbs: avgOutAbs,
      runwayMonths: runway,
    };
  }, [entriesParsed, totalConsolidatedBalance, today]);

  // --------- Dados mensais para gráficos ----------
  const monthlySeries = useMemo(() => {
    // YYYY-MM -> {in, outAbs, net}
    const map: Record<string, { in: number; outAbs: number; net: number }> = {};
    for (const r of entriesParsed) {
      const key = r.due.startOf("month").format("YYYY-MM");
      if (!map[key]) map[key] = { in: 0, outAbs: 0, net: 0 };
      if (r.isCredit) map[key].in += r.amount;
      else map[key].outAbs += r.amount;
      map[key].net += r.signed;
    }
    const keys = Object.keys(map).sort();
    // garantir mês atual presente
    const thisKey = dayjs().startOf("month").format("YYYY-MM");
    if (!map[thisKey]) {
      map[thisKey] = { in: 0, outAbs: 0, net: 0 };
      keys.push(thisKey);
      keys.sort();
    }

    const out = keys.map((k) => ({
      key: k,
      month: dayjs(k).format("MMM/YY"),
      inflow: map[k].in,
      outflow: map[k].outAbs,
      net: map[k].net,
    }));

    // série acumulada
    let acc = 0;
    const cumulative = out.map((d) => {
      acc += d.net;
      return { ...d, cumulative: acc };
    });

    return { bars: out, cumulative };
  }, [entriesParsed]);

  // --------- Pizza por "categoria" (flexível) ----------
  const pieData = useMemo(() => {
    // Tentativas de label: GLA > Document Type > Project > Entity > Tags > "Outros"
    const labelOf = (e: any) =>
      e?.general_ledger_account?.name ||
      e?.document_type?.name ||
      e?.project?.name ||
      e?.entity?.name ||
      e?.tags ||
      "Outros";

    const map: Record<string, number> = {};
    for (const r of entriesParsed) {
      if (!r.isCredit) {
        const lbl = labelOf(r.raw);
        map[lbl] = (map[lbl] ?? 0) + r.amount;
      }
    }
    const arr = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // agrupar cauda como "Outros" (depois do top 7)
    if (arr.length > 8) {
      const top = arr.slice(0, 7);
      const tail = arr.slice(7).reduce((acc, x) => acc + x.value, 0);
      return [...top, { name: "Outros", value: tail }];
    }
    return arr;
  }, [entriesParsed]);

  // --------- Itens em atraso (top 10) ----------
  const overdueItems = useMemo(() => {
    const items = entriesParsed
      .filter((r) => !r.settled && r.due.isBefore(today, "day"))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
    return items.map((r) => ({
      id: (r.raw as any).id,
      date: r.due.format("DD/MM/YYYY"),
      desc: (r.raw as any).description,
      type: r.isCredit ? "Receber" : "Pagar",
      amount: r.amount,
    }));
  }, [entriesParsed, today]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((p) => !p), []);

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
        <div className="mt-[80px] w-full px-6 md:px-10 py-6 space-y-6">
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
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && !loadingBanks && !error && (
            <>
              {/* KPI Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Saldo Consolidado</p>
                  <p className="text-xl font-semibold">{currency(totalConsolidatedBalance ?? 0)}</p>
                  <p className="text-[11px] text-gray-500">Somatório de contas bancárias</p>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Entradas (Período)</p>
                  <p className="text-xl font-semibold text-green-700">{currency(totalInflow)}</p>
                  <p className="text-[11px] text-gray-500">Todas as entradas carregadas</p>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Saídas (Período)</p>
                  <p className="text-xl font-semibold text-red-700">-{currency(totalOutflowAbs)}</p>
                  <p className="text-[11px] text-gray-500">Todas as saídas carregadas</p>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Resultado (Período)</p>
                  <p className={`text-xl font-semibold ${netTotal >= 0 ? "text-blue-900" : "text-red-700"}`}>
                    {netTotal >= 0 ? "+" : ""}
                    {currency(netTotal)}
                  </p>
                  <p className="text-[11px] text-gray-500">{dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}</p>
                </div>
              </section>

              {/* KPIs Operacionais */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500">MTD: Entradas</p>
                  <p className="text-lg font-semibold text-green-700">{currency(mtdInflow)}</p>
                  <p className="text-xs text-gray-500">Mês atual</p>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500">MTD: Saídas</p>
                  <p className="text-lg font-semibold text-red-700">-{currency(mtdOutflowAbs)}</p>
                  <p className="text-xs text-gray-500">Mês atual</p>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500">MTD: Resultado</p>
                  <p className={`text-lg font-semibold ${mtdNet >= 0 ? "text-blue-900" : "text-red-700"}`}>
                    {mtdNet >= 0 ? "+" : ""}
                    {currency(mtdNet)}
                  </p>
                  <p className="text-xs text-gray-500">
                    M/M: {Number.isFinite(momChange) ? (momChange >= 0 ? "+" : "") + pct(momChange) : "—"}
                  </p>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Taxa de Liquidação</p>
                  <p className="text-lg font-semibold">{pct(settlementRate)}</p>
                  <p className="text-xs text-gray-500">No universo carregado</p>
                </div>
              </section>

              {/* Alertas de Curto Prazo */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Vencidos (não liquidados)</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-sm text-gray-600">A Receber</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {currency(overdueReceivablesSum)} <span className="text-xs text-gray-500">({overdueReceivables})</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">A Pagar</p>
                      <p className="text-lg font-semibold text-red-700">
                        {currency(overduePayablesSum)} <span className="text-xs text-gray-500">({overduePayables})</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Próximos 7 dias</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-sm text-gray-600">A Receber</p>
                      <p className="text-lg font-semibold text-blue-900">{currency(next7Receivables)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">A Pagar</p>
                      <p className="text-lg font-semibold text-red-700">{currency(next7Payables)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Próximos 30 dias</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-sm text-gray-600">A Receber</p>
                      <p className="text-lg font-semibold text-blue-900">{currency(next30Receivables)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">A Pagar</p>
                      <p className="text-lg font-semibold text-red-700">{currency(next30Payables)}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Runway */}
              <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-1 rounded-2xl border p-4 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Média Mensal de Saídas</p>
                  <p className="text-lg font-semibold text-red-700">-{currency(avgMonthlyOutflowAbs)}</p>
                  <p className="text-xs text-gray-500 mt-2">Runway Estimada</p>
                  <p className="text-lg font-semibold">
                    {Number.isFinite(runwayMonths)
                      ? `${runwayMonths.toFixed(1)} mês(es)`
                      : "—"}
                  </p>
                </div>

                {/* Gráfico acumulado */}
                <div className="xl:col-span-2 rounded-2xl border p-4 shadow-sm">
                  <p className="text-sm font-medium mb-3">Saldo Acumulado (por competência)</p>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlySeries.cumulative}>
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
                          formatter={(value: number) => currency(value)}
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
              <section className="rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Entradas x Saídas (mensal)</p>
                  <span className="text-xs text-gray-500">
                    {dayjs(startDate).format("MMM/YY")} → {dayjs(endDate).format("MMM/YY")}
                  </span>
                </div>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySeries.bars}>
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
                          currency(value),
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

              {/* Pizza por Categoria (Saídas) + Tabela de Atrasos */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border p-4 shadow-sm">
                  <p className="text-sm font-medium mb-3">Distribuição de Despesas por Categoria</p>
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value: number) => currency(value)}
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

                <div className="rounded-2xl border p-4 shadow-sm overflow-hidden">
                  <p className="text-sm font-medium mb-3">Top 10 Lançamentos em Atraso</p>
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
                          <tr key={it.id} className="border-t">
                            <td className="px-3 py-2">{it.date}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{it.desc}</td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  it.type === "Pagar"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {it.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{currency(it.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Report;

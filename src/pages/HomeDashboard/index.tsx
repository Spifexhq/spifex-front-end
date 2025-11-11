// src/pages/HomeDashboard/index.tsx

import { useEffect, useState } from "react";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import { api } from "src/api/requests";

import type {
  DashboardOverview,
  DashboardEntryPreview,
  DashboardSettlementPreview,
} from "@/models/dashboard/domain";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const todayISO = () => {
  const d = new Date();
  return toISO(d);
};

const formatCurrencyFromMinor = (vMinor: number | null | undefined) => {
  const v = ((vMinor ?? 0) as number) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

const handleGo = (path: string) => {
  window.location.assign(path);
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const HomeDashboard = () => {
  useEffect(() => {
    document.title = "Dashboard | Spifex";
  }, []);

  // Dashboard data
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getCashflowDashboard();
        if (!cancelled) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load dashboard overview", err);
        if (!cancelled) {
          setData(null);
          setError("Não foi possível carregar o dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const overdueEntries: DashboardEntryPreview[] = data?.overdue ?? [];
  const upcomingEntries: DashboardEntryPreview[] = data?.next7 ?? [];
  const recentSettlements: DashboardSettlementPreview[] =
    data?.recent_settlements ?? [];

  const orgName = data?.organization?.name ?? "";
  const stats = data?.stats;

  const openStats = stats?.open_entries ?? {
    count: 0,
    total_minor: 0,
    inflow_minor: 0,
    outflow_minor: 0,
    net_minor: 0,
  };

  const settledStats = stats?.settled_last_30d ?? {
    count: 0,
    inflow_minor: 0,
    outflow_minor: 0,
    net_minor: 0,
  };

  const mastersStats = stats?.masters ?? {
    projects: 0,
    departments: 0,
    entities: 0,
    inventory_items: 0,
  };

  const bankingStats = stats?.banking ?? {
    accounts: 0,
    total_consolidated_balance_minor: 0,
  };

  const globalLoading = loading;

  const hasAnyActivity =
    overdueEntries.length > 0 ||
    upcomingEntries.length > 0 ||
    recentSettlements.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex">
      <TopProgress active={globalLoading} variant="top" topOffset={64} />

      {/* Full-width content (no sidebar) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="mt-[15px] px-10 pb-6 h-[calc(100vh-80px)] grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden">
          {/* --------------------------- Page header --------------------------- */}
          <header className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-semibold text-gray-900">
                Overview{orgName ? ` · ${orgName}` : ""}
              </h1>
              <p className="text-[12px] text-gray-500">
                Visão rápida da saúde financeira da empresa: fluxo aberto,
                liquidações recentes e próximos vencimentos.
              </p>
            </div>
            <div className="text-right text-[11px] text-gray-500">
              <div>Hoje: {formatDate(todayISO())}</div>
            </div>
          </header>

          {/* --------------------------- Summary row -------------------------- */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Open entries summary */}
            <div className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-600">
                  Fluxo aberto (geral)
                </span>
                <span className="text-[10px] text-gray-400">
                  {openStats.count} lançamentos em aberto
                </span>
              </div>
              <div className="text-[18px] font-semibold tabular-nums">
                <span
                  className={
                    openStats.net_minor >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }
                >
                  {formatCurrencyFromMinor(openStats.net_minor)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500 leading-snug">
                <div>
                  A receber:{" "}
                  <span className="text-emerald-700 font-medium">
                    {formatCurrencyFromMinor(openStats.inflow_minor)}
                  </span>
                </div>
                <div>
                  A pagar:{" "}
                  <span className="text-red-700 font-medium">
                    {formatCurrencyFromMinor(openStats.outflow_minor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Settled last 30 days summary */}
            <div className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-600">
                  Liquidações · últimos 30 dias
                </span>
                <span className="text-[10px] text-gray-400">
                  {settledStats.count} movimentos
                </span>
              </div>
              <div className="text-[18px] font-semibold tabular-nums">
                <span
                  className={
                    settledStats.net_minor >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }
                >
                  {formatCurrencyFromMinor(settledStats.net_minor)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500 leading-snug">
                <div>
                  Entradas:{" "}
                  <span className="text-emerald-700 font-medium">
                    {formatCurrencyFromMinor(settledStats.inflow_minor)}
                  </span>
                </div>
                <div>
                  Saídas:{" "}
                  <span className="text-red-700 font-medium">
                    {formatCurrencyFromMinor(settledStats.outflow_minor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Banking & structure summary */}
            <div className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-400">
                  Bancos & estrutura
                </span>
                <span className="text-[10px] text-gray-400">
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/banks")}
                  >
                    {bankingStats.accounts} contas bancárias ativas
                  </span>
                </span>
              </div>
              <div className="text-[18px] font-semibold tabular-nums">
                <span className="text-gray-900">
                  {formatCurrencyFromMinor(
                    bankingStats.total_consolidated_balance_minor
                  )}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-gray-400 leading-snug">
                <div>
                  Entidades:{" "}
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/entities")}
                  >
                    {mastersStats.entities}
                  </span>{" "}
                  · Projetos:{" "}
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/projects")}
                  >
                    {mastersStats.projects}
                  </span>
                </div>
                <div>
                  Departamentos:{" "}
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/departments")}
                  >
                    {mastersStats.departments}
                  </span>{" "}
                  · Itens estoque:{" "}
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/inventory")}
                  >
                    {mastersStats.inventory_items}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* --------------------------- Activity area ------------------------ */}
          <div className="min-h-0 h-full grid grid-cols-12 gap-4">
            {/* Left column: Overdue + Next 7 days */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0">
              {/* Overdue entries */}
              <section className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[13px] font-semibold text-gray-800">
                    Overdue cash
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    Top {overdueEntries.length || 0} entries
                  </span>
                </div>

                <div className="border-t border-gray-100 -mx-4 mb-2" />

                <div className="min-h-0 overflow-y-auto">
                  {overdueEntries.length === 0 ? (
                    <div className="text-[12px] text-gray-500 py-2">
                      No overdue entries at the moment.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {overdueEntries.map((e) => (
                        <li
                          key={e.id}
                          className="py-2 px-2 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-medium border ${
                                  e.tx_type === 1
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-red-50 text-red-700 border-red-100"
                                }`}
                              >
                                {e.tx_type === 1 ? "Inflow" : "Outflow"}
                              </span>
                              <span className="text-[12px] text-gray-900 truncate">
                                {e.description || "No description"}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                              Due {formatDate(e.due_date)}
                              {e.entity_name && ` · ${e.entity_name}`}
                              {e.project_name && ` · ${e.project_name}`}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className={`text-[12px] font-semibold tabular-nums ${
                                e.tx_type === 1
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {formatCurrencyFromMinor(e.amount_minor)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* Next 7 days */}
              <section className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[13px] font-semibold text-gray-800">
                    Next 7 days
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    Top {upcomingEntries.length || 0} entries
                  </span>
                </div>

                <div className="border-t border-gray-100 -mx-4 mb-2" />

                <div className="min-h-0 overflow-y-auto">
                  {upcomingEntries.length === 0 ? (
                    <div className="text-[12px] text-gray-500 py-2">
                      No upcoming entries in the next 7 days.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {upcomingEntries.map((e) => (
                        <li
                          key={e.id}
                          className="py-2 px-2 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-medium border ${
                                  e.tx_type === 1
                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}
                              >
                                {e.tx_type === 1 ? "Inflow" : "Outflow"}
                              </span>
                              <span className="text-[12px] text-gray-900 truncate">
                                {e.description || "No description"}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                              Due {formatDate(e.due_date)}
                              {e.entity_name && ` · ${e.entity_name}`}
                              {e.project_name && ` · ${e.project_name}`}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className={`text-[12px] font-semibold tabular-nums ${
                                e.tx_type === 1
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {formatCurrencyFromMinor(e.amount_minor)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>

            {/* Right column: Settlements + empty state helpers */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 min-h-0">
              {/* Recent settlements */}
              <section className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col min-h-[180px]">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[13px] font-semibold text-gray-800">
                    Recent settlements
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    Last {recentSettlements.length || 0}
                  </span>
                </div>

                <div className="border-t border-gray-100 -mx-4 mb-2" />

                <div className="min-h-0 overflow-y-auto">
                  {recentSettlements.length === 0 ? (
                    <div className="text-[12px] text-gray-500 py-2">
                      No recent settlements.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {recentSettlements.map((s) => (
                        <li
                          key={s.id}
                          className="py-2 px-2 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Settled
                              </span>
                              <span className="text-[12px] text-gray-900 truncate">
                                {s.entry_description || "No description"}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                              {formatDate(s.value_date)} · {s.bank_label}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[12px] font-semibold text-emerald-700 tabular-nums">
                              {formatCurrencyFromMinor(s.amount_minor)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* Empty-state / quick helpers */}
              {!hasAnyActivity && !error && (
                <section className="border border-dashed border-gray-300 rounded-md bg-gray-50 px-4 py-3">
                  <h3 className="text-[13px] font-semibold text-gray-800 mb-1">
                    Ready to start?
                  </h3>
                  <p className="text-[12px] text-gray-600 mb-2">
                    Crie seus primeiros lançamentos ou conecte contas bancárias
                    para ver mais insights no dashboard.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-[11px] border border-gray-300 rounded px-2 py-[4px] bg-white hover:bg-gray-100"
                      onClick={() => handleGo("/cashflow")}
                    >
                      Go to Cashflow
                    </button>
                    <button
                      type="button"
                      className="text-[11px] border border-gray-300 rounded px-2 py-[4px] bg-white hover:bg-gray-100"
                      onClick={() => handleGo("/settings/banks")}
                    >
                      Manage bank accounts
                    </button>
                  </div>
                </section>
              )}

              {error && (
                <section className="border border-red-200 rounded-md bg-red-50 px-4 py-3">
                  <p className="text-[12px] text-red-700">
                    {error} Tente recarregar a página.
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;

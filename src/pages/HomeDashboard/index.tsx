// src/pages/HomeDashboard/index.tsx

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { api } from "@/api/requests";

import type {
  DashboardOverview,
  DashboardEntryPreview,
  DashboardSettlementPreview,
} from "@/models/components/dashboard";

import { formatDateFromISO } from "@/lib/date/formatDate";
import { formatCurrency } from "@/lib/currency/formatCurrency";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const todayISO = () => toISO(new Date());

const parseMoney = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = typeof v === "number" ? String(v) : String(v).trim();
  const n = Number(s.replace(",", ".")); // backend should send "1234.56"
  return Number.isFinite(n) ? n : null;
};

const fmtMoney = (v: unknown) => {
  const n = parseMoney(v);
  return n === null ? "—" : formatCurrency(n);
};

const moneyIsNonNegative = (v: unknown) => (parseMoney(v) ?? 0) >= 0;

/** Formats a date using the cookie-aware formatter. */
const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";

  if (value instanceof Date) {
    const iso = value.toISOString().slice(0, 10);
    return formatDateFromISO(iso) || "—";
  }

  const trimmed = value.trim();
  if (!trimmed) return "—";

  const isoCandidate =
    trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)
      ? trimmed.slice(0, 10)
      : trimmed;

  return formatDateFromISO(isoCandidate) || trimmed;
};

const handleGo = (path: string) => {
  window.location.assign(path);
};

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

const HomeDashboard = () => {
  const { t } = useTranslation("homeDashboard");

  useEffect(() => {
    document.title = t("header.pageTitle");
  }, [t]);

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setHasError(false);

      try {
        const res = await api.getCashflowDashboard();
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error("Failed to load dashboard overview", err);
        if (!cancelled) {
          setData(null);
          setHasError(true);
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

  // Treat as decimal strings/numbers, not minor units.
  const openStats = stats?.open_entries ?? {
    count: 0,
    total: "0.00",
    inflow: "0.00",
    outflow: "0.00",
    net: "0.00",
  };

  const settledStats = stats?.settled_last_30d ?? {
    count: 0,
    inflow: "0.00",
    outflow: "0.00",
    net: "0.00",
  };

  const mastersStats = stats?.masters ?? {
    projects: 0,
    departments: 0,
    entities: 0,
    inventory_items: 0,
  };

  const bankingStats = stats?.banking ?? {
    accounts: 0,
    total_consolidated_balance: "0.00",
  };

  const hasAnyActivity =
    overdueEntries.length > 0 ||
    upcomingEntries.length > 0 ||
    recentSettlements.length > 0;

  return (
    <div className="flex">
      <TopProgress active={loading} variant="top" topOffset={64} />

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="mt-[15px] px-10 pb-6 h-[calc(100vh-80px)] grid grid-rows-[auto_auto_minmax(0,1fr)] gap-4 overflow-hidden">
          <header className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-semibold text-gray-900">
                {t("header.title")}
                {orgName ? ` · ${orgName}` : ""}
              </h1>
              <p className="text-[12px] text-gray-500">{t("header.subtitle")}</p>
            </div>
            <div className="text-right text-[11px] text-gray-500">
              <div>
                {t("header.today")}: {formatDate(todayISO())}
              </div>
            </div>
          </header>

          {/* Summary row */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Open entries summary */}
            <div className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-600">
                  {t("summary.openTitle")}
                </span>
                <span className="text-[10px] text-gray-400">
                  {t("summary.openCount", { count: openStats.count })}
                </span>
              </div>

              <div className="text-[18px] font-semibold tabular-nums">
                <span
                  className={
                    moneyIsNonNegative(openStats.net)
                      ? "text-emerald-700"
                      : "text-red-700"
                  }
                >
                  {fmtMoney(openStats.net)}
                </span>
              </div>

              <div className="mt-1 text-[11px] text-gray-500 leading-snug">
                <div>
                  {t("summary.toReceive")}:{" "}
                  <span className="text-emerald-700 font-medium">
                    {fmtMoney(openStats.inflow)}
                  </span>
                </div>
                <div>
                  {t("summary.toPay")}:{" "}
                  <span className="text-red-700 font-medium">
                    {fmtMoney(openStats.outflow)}
                  </span>
                </div>
              </div>
            </div>

            {/* Settled last 30 days summary */}
            <div className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-600">
                  {t("summary.settledTitle")}
                </span>
                <span className="text-[10px] text-gray-400">
                  {t("summary.settledCount", { count: settledStats.count })}
                </span>
              </div>

              <div className="text-[18px] font-semibold tabular-nums">
                <span
                  className={
                    moneyIsNonNegative(settledStats.net)
                      ? "text-emerald-700"
                      : "text-red-700"
                  }
                >
                  {fmtMoney(settledStats.net)}
                </span>
              </div>

              <div className="mt-1 text-[11px] text-gray-500 leading-snug">
                <div>
                  {t("summary.entriesIn")}:{" "}
                  <span className="text-emerald-700 font-medium">
                    {fmtMoney(settledStats.inflow)}
                  </span>
                </div>
                <div>
                  {t("summary.entriesOut")}:{" "}
                  <span className="text-red-700 font-medium">
                    {fmtMoney(settledStats.outflow)}
                  </span>
                </div>
              </div>
            </div>

            {/* Banking & structure summary */}
            <div className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-400">
                  {t("summary.bankingTitle")}
                </span>
                <span className="text-[10px] text-gray-400">
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/banks")}
                  >
                    {t("summary.accountsActive", { count: bankingStats.accounts })}
                  </span>
                </span>
              </div>

              <div className="text-[18px] font-semibold tabular-nums">
                <span className="text-gray-900">
                  {fmtMoney(bankingStats.total_consolidated_balance)}
                </span>
              </div>

              <div className="mt-1 text-[11px] text-gray-400 leading-snug">
                <div>
                  {t("summary.entities")}:{" "}
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/entities")}
                  >
                    {mastersStats.entities}
                  </span>{" "}
                  · {t("summary.projects")}:{" "}
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/projects")}
                  >
                    {mastersStats.projects}
                  </span>
                </div>
                <div>
                  {t("summary.departments")}:{" "}
                  <span
                    className="font-medium cursor-pointer rounded px-1 hover:text-gray-500 transition"
                    onClick={() => handleGo("/settings/departments")}
                  >
                    {mastersStats.departments}
                  </span>{" "}
                  · {t("summary.inventoryItems")}:{" "}
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

          {/* Activity area */}
          <div className="min-h-0 h-full grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0 h-full">
              {/* Overdue entries */}
              <section className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col min-h-0 overflow-hidden flex-[0.85]">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[13px] font-semibold text-gray-800">
                    {t("activity.overdueTitle")}
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    {t("activity.overdueTop", { count: overdueEntries.length || 0 })}
                  </span>
                </div>

                <div className="border-t border-gray-100 -mx-4 mb-2" />

                <div className="min-h-0 overflow-y-auto">
                  {overdueEntries.length === 0 ? (
                    <div className="text-[12px] text-gray-500 py-2">
                      {t("activity.overdueEmpty")}
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
                                {e.tx_type === 1 ? t("activity.inflow") : t("activity.outflow")}
                              </span>
                              <span className="text-[12px] text-gray-900 truncate">
                                {e.description || t("activity.noDescription")}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                              {t("activity.due")} {formatDate(e.due_date)}
                              {e.entity_name && ` · ${e.entity_name}`}
                              {e.project_name && ` · ${e.project_name}`}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div
                              className={`text-[12px] font-semibold tabular-nums ${
                                e.tx_type === 1 ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {fmtMoney((e as unknown as { amount?: unknown }).amount)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* Next 7 days */}
              <section className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col min-h-0 overflow-hidden flex-[1.15]">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[13px] font-semibold text-gray-800">
                    {t("activity.next7Title")}
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    {t("activity.next7Top", { count: upcomingEntries.length || 0 })}
                  </span>
                </div>

                <div className="border-t border-gray-100 -mx-4 mb-2" />

                <div className="min-h-0 overflow-y-auto">
                  {upcomingEntries.length === 0 ? (
                    <div className="text-[12px] text-gray-500 py-2">
                      {t("activity.next7Empty")}
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
                                {e.tx_type === 1 ? t("activity.inflow") : t("activity.outflow")}
                              </span>
                              <span className="text-[12px] text-gray-900 truncate">
                                {e.description || t("activity.noDescription")}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                              {t("activity.due")} {formatDate(e.due_date)}
                              {e.entity_name && ` · ${e.entity_name}`}
                              {e.project_name && ` · ${e.project_name}`}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div
                              className={`text-[12px] font-semibold tabular-nums ${
                                e.tx_type === 1 ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {fmtMoney((e as unknown as { amount?: unknown }).amount)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 min-h-0">
              {/* Recent settlements */}
              <section className="border border-gray-300 rounded-md bg-white px-4 py-3 flex flex-col min-h-[180px]">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[13px] font-semibold text-gray-800">
                    {t("activity.recentSettlementsTitle")}
                  </h2>
                  <span className="text-[11px] text-gray-500">
                    {t("activity.recentSettlementsCount", {
                      count: recentSettlements.length || 0,
                    })}
                  </span>
                </div>

                <div className="border-t border-gray-100 -mx-4 mb-2" />

                <div className="min-h-0 overflow-y-auto">
                  {recentSettlements.length === 0 ? (
                    <div className="text-[12px] text-gray-500 py-2">
                      {t("activity.recentSettlementsEmpty")}
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
                                {t("labels.settled")}
                              </span>
                              <span className="text-[12px] text-gray-900 truncate">
                                {s.entry_description || t("activity.noDescription")}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                              {formatDate(s.value_date)} · {s.bank_label}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[12px] font-semibold text-emerald-700 tabular-nums">
                              {fmtMoney((s as unknown as { amount?: unknown }).amount)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {!hasAnyActivity && !hasError && (
                <section className="border border-dashed border-gray-300 rounded-md bg-gray-50 px-4 py-3">
                  <h3 className="text-[13px] font-semibold text-gray-800 mb-1">
                    {t("empty.title")}
                  </h3>
                  <p className="text-[12px] text-gray-600 mb-2">
                    {t("empty.description")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-[11px] border border-gray-300 rounded px-2 py-[4px] bg-white hover:bg-gray-100"
                      onClick={() => handleGo("/cashflow")}
                    >
                      {t("empty.goToCashflow")}
                    </button>
                    <button
                      type="button"
                      className="text-[11px] border border-gray-300 rounded px-2 py-[4px] bg-white hover:bg-gray-100"
                      onClick={() => handleGo("/settings/banks")}
                    >
                      {t("empty.manageBanks")}
                    </button>
                  </div>
                </section>
              )}

              {hasError && (
                <section className="border border-red-200 rounded-md bg-red-50 px-4 py-3">
                  <p className="text-[12px] text-red-700">
                    {t("errors.loadDashboard")} {t("errors.retry")}
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

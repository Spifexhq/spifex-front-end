import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { api } from "src/api/requests";
import BanksTable from "src/components/Table/BanksTable";
import type { EntryFilters } from "src/models/entries";
import type { BankAccount } from "@/models/enterprise_structure/domain";
import type { CashflowKpis, SettledKpis } from "@/models/entries";
import type { RootState } from "@/redux/rootReducer";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type KpiItem = {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; positive?: boolean };
};

type BanksData = {
  banks: BankAccount[];
  totalConsolidatedBalance: number;
  loading: boolean;
  error: string | null;
};

interface KpiCardsProps {
  items?: KpiItem[];
  selectedBankIds?: (string | number)[];
  filters?: EntryFilters;
  context?: "cashflow" | "settled";
  refreshToken?: number;
  banksRefreshKey?: number;
  banksData: BanksData;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const currencyFromMinor = (vMinor: number) => {
  const v = (vMinor || 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

function getInitials(name: string) {
  if (!name) return "BK";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

const KpiCards: React.FC<KpiCardsProps> = ({
  selectedBankIds,
  filters,
  context = "cashflow",
  refreshToken = 0,
  banksRefreshKey,
  banksData,
}) => {
  const { t } = useTranslation(["kpiCards"]);
  const { banks, loading: banksLoading } = banksData;

  const orgExternalId = useSelector(
    (s: RootState) =>
      (s).auth?.orgExternalId ||
      (s).auth?.organization?.organization?.external_id ||
      (s).auth?.organization?.external_id
  ) as string | undefined;

  const [cf, setCf] = useState<CashflowKpis | null>(null);
  const [st, setSt] = useState<SettledKpis | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const goToBanks = React.useCallback(() => {
    if (navigate) navigate("/settings/banks");
    else window.location.assign("/settings/banks");
  }, [navigate]);

  /* -------------------- Panel-only bank filtering (local) ------------------- */
  const toKey = (v: unknown) => String(v);
  const filteredBanks = useMemo(() => {
    const bankList = Array.isArray(banks) ? banks : [];
    if (!selectedBankIds || selectedBankIds.length === 0) return bankList;
    const set = new Set(selectedBankIds.map(toKey));
    return bankList.filter((b) => set.has(toKey(b.id)));
  }, [banks, selectedBankIds]);

  const filteredTotalConsolidated = useMemo(
    () => filteredBanks.reduce((acc, b) => acc + Number(b.consolidated_balance ?? 0), 0),
    [filteredBanks]
  );

  /* ---------------------- Build query params from filters ------------------- */
  const glParam = useMemo(
    () => (filters?.gla_id?.length ? filters.gla_id.join(",") : undefined),
    [filters?.gla_id]
  );

  const bankParam = useMemo(
    () => (filters?.bank_id?.length ? filters.bank_id.join(",") : undefined),
    [filters?.bank_id]
  );

  /* --------------------------- Fetch KPIs from API -------------------------- */
  useEffect(() => {
    if (!orgExternalId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        if (context === "settled") {
          const { data } = await api.getSettledKpis(orgExternalId, {
            description: filters?.description,
            observation: filters?.observation,
            gl: glParam,
            bank_id: bankParam,
          });
          if (mounted) {
            setSt(data);
            setCf(null);
          }
        } else {
          const { data } = await api.getCashflowKpis(orgExternalId, {
            description: filters?.description,
            observation: filters?.observation,
            gl: glParam,
          });
          if (mounted) {
            setCf(data);
            setSt(null);
          }
        }
      } catch (e) {
        console.error("KPI fetch failed", e);
        if (mounted) {
          setCf(null);
          setSt(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [orgExternalId, context, glParam, bankParam, filters?.description, filters?.observation, refreshToken]);

  /* ------------------------ Map server KPIs to UI cards --------------------- */
  const cashflowKpis: KpiItem[] = useMemo(() => {
    if (!cf)
      return [
        { key: "mtdNet", label: t("kpiCards:cashflow.labels.mtdNet"), value: "—", hint: t("kpiCards:loading") },
        { key: "overdueNet", label: t("kpiCards:cashflow.labels.overdueNet"), value: "—", hint: t("kpiCards:loading") },
        { key: "next7Net", label: t("kpiCards:cashflow.labels.next7Net"), value: "—", hint: t("kpiCards:loading") },
      ];

    const mom = cf.mom_change;
    const momLabel = cf.mom_infinite
      ? "∞%"
      : mom == null
      ? "—"
      : `${(Math.abs(mom) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

    const momPositive = cf.mom_infinite
      ? cf.mtd.net_minor >= 0
      : cf.mtd.net_minor >= 0
      ? (mom ?? 0) >= 0
      : (mom ?? 0) <= 0;

    return [
      {
        key: "mtdNet",
        label: t("kpiCards:cashflow.labels.mtdNet"),
        value: `${cf.mtd.net_minor >= 0 ? "+" : ""}${currencyFromMinor(cf.mtd.net_minor)}`,
        hint: t("kpiCards:cashflow.hints.mtd", {
          inAmt: currencyFromMinor(cf.mtd.in_minor),
          outAmt: currencyFromMinor(cf.mtd.out_minor),
        }),
        delta: {
          value: t("kpiCards:delta.mom", {
            value: `${cf.mtd.net_minor >= 0 ? "+" : ""}${momLabel}`,
          }),
          positive: momPositive,
        },
      },
      {
        key: "overdueNet",
        label: t("kpiCards:cashflow.labels.overdueNet"),
        value: `${cf.overdue.net_minor >= 0 ? "+" : ""}${currencyFromMinor(cf.overdue.net_minor)}`,
        hint: t("kpiCards:cashflow.hints.overdue", {
          recAmt: currencyFromMinor(cf.overdue.rec_minor),
          payAmt: currencyFromMinor(cf.overdue.pay_minor),
        }),
      },
      {
        key: "next7Net",
        label: t("kpiCards:cashflow.labels.next7Net"),
        value: `${currencyFromMinor(cf.next7.net_minor)}`,
        hint: t("kpiCards:cashflow.hints.next7", {
          recAmt: currencyFromMinor(cf.next7.rec_minor),
          payAmt: currencyFromMinor(cf.next7.pay_minor),
        }),
      },
    ];
  }, [cf, t]);

  const settledKpis: KpiItem[] = useMemo(() => {
    if (!st)
      return [
        { key: "mtdSettledNet", label: t("kpiCards:settled.labels.mtdSettledNet"), value: "—", hint: t("kpiCards:loading") },
        { key: "prevSettledNet", label: t("kpiCards:settled.labels.prevSettledNet"), value: "—", hint: t("kpiCards:loading") },
        { key: "last7Settled", label: t("kpiCards:settled.labels.last7Settled"), value: "—", hint: t("kpiCards:loading") },
      ];

    const mom = st.mom_change;
    const momLabel =
      st.mom_infinite ? "∞%" : mom == null ? "—" : `${(mom * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

    const momPositive = st.mom_infinite
      ? st.mtd.net_minor >= 0
      : st.mtd.net_minor >= 0
      ? (mom ?? 0) >= 0
      : (mom ?? 0) <= 0;

    return [
      {
        key: "mtdSettledNet",
        label: t("kpiCards:settled.labels.mtdSettledNet"),
        value: `${st.mtd.net_minor >= 0 ? "+" : ""}${currencyFromMinor(st.mtd.net_minor)}`,
        hint: t("kpiCards:settled.hints.mtd", {
          recAmt: currencyFromMinor(st.mtd.in_minor),
          payAmt: currencyFromMinor(st.mtd.out_minor),
        }),
        delta: {
          value: t("kpiCards:delta.mom", {
            value: `${st.mtd.net_minor >= 0 ? "+" : ""}${momLabel}`,
          }),
          positive: momPositive,
        },
      },
      {
        key: "prevSettledNet",
        label: t("kpiCards:settled.labels.prevSettledNet"),
        value: `${st.prev.net_minor >= 0 ? "+" : ""}${currencyFromMinor(st.prev.net_minor)}`,
        hint: t("kpiCards:settled.hints.prev", {
          recAmt: currencyFromMinor(st.prev.in_minor),
          payAmt: currencyFromMinor(st.prev.out_minor),
        }),
      },
      {
        key: "last7Settled",
        label: t("kpiCards:settled.labels.last7Settled"),
        value: `${st.last7.net_minor >= 0 ? "+" : ""}${currencyFromMinor(st.last7.net_minor)}`,
        hint: t("kpiCards:settled.hints.last7", {
          recAmt: currencyFromMinor(st.last7.in_minor),
          payAmt: currencyFromMinor(st.last7.out_minor),
        }),
      },
    ];
  }, [st, t]);

  const autoKpis = context === "settled" ? settledKpis : cashflowKpis;

  /* --------------------------------- UI state ------------------------------- */
  const [expanded, setExpanded] = useState(false);

  const rightPlacement = (i: number) => {
    if (!expanded) return "lg:col-span-3";
    if (i === 0) return "lg:col-span-3 lg:col-start-7";
    if (i === 1) return "lg:col-span-3 lg:col-start-10";
    if (i === 2) return "lg:col-span-6 lg:col-start-7";
    return "lg:col-span-3 lg:col-start-7";
  };

  const totalFmt = useMemo(
    () =>
      Number(filteredTotalConsolidated || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [filteredTotalConsolidated]
  );

  const topBank = useMemo(() => {
    if (!filteredBanks?.length) return null;
    return [...filteredBanks].sort((a, b) =>
      Number(a.consolidated_balance || 0) < Number(b.consolidated_balance || 0) ? 1 : -1
    )[0];
  }, [filteredBanks]);

  /* --------------------------------- Render -------------------------------- */
  return (
    <section className="relative max-h-[35vh]">
      <LayoutGroup>
        <motion.div
          layout
          className={`grid grid-cols-12 gap-3 w-full ${expanded ? "grid-rows-[100px_100px] auto-rows-[100px]" : ""}`}
          transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
        >
          {/* Bank panel (left) */}
          <AnimatePresence initial={false}>
            {!expanded ? (
              <motion.button
                key="banks-card"
                layout
                transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
                onClick={() => setExpanded(true)}
                className="col-span-12 sm:col-span-6 lg:col-span-3 h-[100px] border border-gray-300 rounded-md bg-white px-3 py-2 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-gray-600">
                    {t("kpiCards:panel.consolidatedBalance")}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {t("kpiCards:panel.accountsCount", { count: filteredBanks.length || 0 })}
                  </span>
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">{totalFmt}</div>
                {topBank && (
                  <div className="mt-1 flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 shrink-0 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                      {getInitials(topBank.institution)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] text-gray-800 truncate leading-tight">{topBank.institution}</div>
                      <div className="text-[10px] text-gray-500 truncate leading-tight">
                        {Number(topBank.consolidated_balance || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="banks-panel"
                layout
                transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
                className="col-span-12 lg:col-span-6 lg:col-start-1 row-span-2"
              >
                <div className="border border-gray-300 rounded-md bg-white overflow-hidden flex flex-col h-full">
                  {/* Sticky header */}
                  <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-300">
                    <div className="text-[12px] text-gray-700">
                      {t("kpiCards:panel.header")}{" "}
                      <button
                        type="button"
                        onClick={goToBanks}
                        className="font-semibold text-gray-800 tabular-nums px-1 -mx-1 rounded hover:text-gray-600 focus:outline-none transition"
                        aria-label={t("kpiCards:aria.goToBanks")}
                        title={t("kpiCards:aria.openBanks")}
                      >
                        {totalFmt}
                      </button>
                    </div>
                    <button
                      className="text-[12px] px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-100"
                      onClick={() => setExpanded(false)}
                    >
                      {t("kpiCards:actions.close")}
                    </button>
                  </div>
                  {/* Scroll area */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <BanksTable
                      key={banksRefreshKey}
                      banks={filteredBanks}
                      totalConsolidatedBalance={filteredTotalConsolidated}
                      loading={banksLoading}
                      error={banksData.error}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KPI cards (right) */}
          {autoKpis.map((kpi, i) => (
            <motion.div
              key={kpi.key}
              layout
              transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
              className={`col-span-12 sm:col-span-6 ${rightPlacement(i)} h-[100px] border border-gray-300 rounded-md bg-white px-3 py-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-600">{kpi.label}</span>
                {kpi.delta && (
                  <span className={`text-[11px] ${kpi.delta.positive ? "text-green-600" : "text-red-600"}`}>
                    {kpi.delta.value}
                  </span>
                )}
              </div>
              <div className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">
                {loading ? "—" : kpi.value}
              </div>
              {kpi.hint && (
                <div className="mt-0.5 text-[11px] text-gray-500">{loading ? t("kpiCards:loading") : kpi.hint}</div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </LayoutGroup>
    </section>
  );
};

export default KpiCards;

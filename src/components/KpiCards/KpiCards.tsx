/* --------------------------------------------------------------------------
 * File: src/components/KpiCards/KpiCards.tsx
 * Updates requested:
 * - Mobile KPI strip: scrolls but scrollbar is hidden/invisible
 * (BanksTable scrollbar hiding is handled inside BanksTable)
 * - Wrap KPI area with PermissionMiddleware:
 *   - cashflow => view_cash_flow_kpis
 *   - settled  => view_settlement_kpis
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/api/requests";
import BanksTable from "@/components/Table/BanksTable";

import { formatCurrency } from "@/lib/currency/formatCurrency";
import { PermissionMiddleware } from "@/middlewares";

import type { CashflowKpis, SettledKpis } from "@/models/components/cardKpis";
import type { EntryFilters } from "@/models/components/filterBar";

export type KpiItem = {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; positive?: boolean };
};

interface KpiCardsProps {
  selectedBankIds?: (string | number)[];
  filters?: EntryFilters;
  context?: "cashflow" | "settled";
  refreshToken?: number;
  banksRefreshKey?: number;
}

const parseMoney = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = typeof v === "number" ? String(v) : String(v).trim();
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const currencyFromDecimal = (v: unknown) => {
  const n = parseMoney(v);
  return n === null ? "—" : formatCurrency(n);
};

const signedCurrencyFromDecimal = (v: unknown) => {
  const n = parseMoney(v);
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${formatCurrency(n)}`;
};

const KpiCards: React.FC<KpiCardsProps> = ({
  selectedBankIds,
  filters,
  context = "cashflow",
  refreshToken = 0,
  banksRefreshKey = 0,
}) => {
  const { t } = useTranslation(["kpiCards"]);

  const tr = useCallback(
    (key: string, options?: Record<string, unknown>) => String(t(key as never, options as never)),
    [t],
  );

  const [cf, setCf] = useState<CashflowKpis | null>(null);
  const [st, setSt] = useState<SettledKpis | null>(null);
  const [loading, setLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mql.matches);

    apply();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }

    const legacy = mql as unknown as {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };

    if (typeof legacy.addListener === "function") legacy.addListener(apply);
    return () => {
      if (typeof legacy.removeListener === "function") legacy.removeListener(apply);
    };
  }, []);

  const navigate = useNavigate();
  const goToBanks = useCallback(() => {
    navigate("/settings/banks");
  }, [navigate]);

  const ledgerAccountParam = useMemo(
    () => (filters?.ledger_account_id?.length ? filters.ledger_account_id.join(",") : undefined),
    [filters?.ledger_account_id],
  );

  const bankParam = useMemo(
    () => (filters?.bank_id?.length ? filters.bank_id.join(",") : undefined),
    [filters?.bank_id],
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        if (context === "settled") {
          const { data } = await api.getSettledKpis({
            description: filters?.description,
            observation: filters?.observation,
            ledger_account: ledgerAccountParam,
            bank_id: bankParam,
          });
          if (mounted) {
            setSt(data);
            setCf(null);
          }
        } else {
          const { data } = await api.getCashflowKpis({
            description: filters?.description,
            observation: filters?.observation,
            ledger_account: ledgerAccountParam,
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
  }, [context, ledgerAccountParam, bankParam, filters?.description, filters?.observation, refreshToken]);

  const cashflowKpis: KpiItem[] = useMemo(() => {
    if (!cf) {
      const loadingTxt = tr("kpiCards:loading");
      return [
        { key: "mtdNet", label: tr("kpiCards:cashflow.labels.mtdNet"), value: "—", hint: loadingTxt },
        { key: "overdueNet", label: tr("kpiCards:cashflow.labels.overdueNet"), value: "—", hint: loadingTxt },
        { key: "next7Net", label: tr("kpiCards:cashflow.labels.next7Net"), value: "—", hint: loadingTxt },
      ];
    }

    const mom = cf.mom_change;
    const momLabel = cf.mom_infinite
      ? "∞%"
      : mom == null
        ? "—"
        : `${(Math.abs(mom) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

    const mtdNetN = parseMoney(cf.mtd.net) ?? 0;
    const momPositive = cf.mom_infinite
      ? mtdNetN >= 0
      : mtdNetN >= 0
        ? (mom ?? 0) >= 0
        : (mom ?? 0) <= 0;

    return [
      {
        key: "mtdNet",
        label: tr("kpiCards:cashflow.labels.mtdNet"),
        value: signedCurrencyFromDecimal(cf.mtd.net),
        hint: tr("kpiCards:cashflow.hints.mtd", {
          inAmt: currencyFromDecimal(cf.mtd.in),
          outAmt: currencyFromDecimal(cf.mtd.out),
        }),
        delta: {
          value: tr("kpiCards:delta.mom", { value: `${mtdNetN >= 0 ? "+" : ""}${momLabel}` }),
          positive: momPositive,
        },
      },
      {
        key: "overdueNet",
        label: tr("kpiCards:cashflow.labels.overdueNet"),
        value: signedCurrencyFromDecimal(cf.overdue.net),
        hint: tr("kpiCards:cashflow.hints.overdue", {
          recAmt: currencyFromDecimal(cf.overdue.rec),
          payAmt: currencyFromDecimal(cf.overdue.pay),
        }),
      },
      {
        key: "next7Net",
        label: tr("kpiCards:cashflow.labels.next7Net"),
        value: currencyFromDecimal(cf.next7.net),
        hint: tr("kpiCards:cashflow.hints.next7", {
          recAmt: currencyFromDecimal(cf.next7.rec),
          payAmt: currencyFromDecimal(cf.next7.pay),
        }),
      },
    ];
  }, [cf, tr]);

  const settledKpis: KpiItem[] = useMemo(() => {
    if (!st) {
      const loadingTxt = tr("kpiCards:loading");
      return [
        { key: "mtdSettledNet", label: tr("kpiCards:settled.labels.mtdSettledNet"), value: "—", hint: loadingTxt },
        { key: "prevSettledNet", label: tr("kpiCards:settled.labels.prevSettledNet"), value: "—", hint: loadingTxt },
        { key: "last7Settled", label: tr("kpiCards:settled.labels.last7Settled"), value: "—", hint: loadingTxt },
      ];
    }

    const mom = st.mom_change;
    const momLabel = st.mom_infinite
      ? "∞%"
      : mom == null
        ? "—"
        : `${(mom * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

    const mtdNetN = parseMoney(st.mtd.net) ?? 0;
    const momPositive = st.mom_infinite
      ? mtdNetN >= 0
      : mtdNetN >= 0
        ? (mom ?? 0) >= 0
        : (mom ?? 0) <= 0;

    return [
      {
        key: "mtdSettledNet",
        label: tr("kpiCards:settled.labels.mtdSettledNet"),
        value: signedCurrencyFromDecimal(st.mtd.net),
        hint: tr("kpiCards:settled.hints.mtd", {
          recAmt: currencyFromDecimal(st.mtd.in),
          payAmt: currencyFromDecimal(st.mtd.out),
        }),
        delta: {
          value: tr("kpiCards:delta.mom", { value: `${mtdNetN >= 0 ? "+" : ""}${momLabel}` }),
          positive: momPositive,
        },
      },
      {
        key: "prevSettledNet",
        label: tr("kpiCards:settled.labels.prevSettledNet"),
        value: signedCurrencyFromDecimal(st.prev.net),
        hint: tr("kpiCards:settled.hints.prev", {
          recAmt: currencyFromDecimal(st.prev.in),
          payAmt: currencyFromDecimal(st.prev.out),
        }),
      },
      {
        key: "last7Settled",
        label: tr("kpiCards:settled.labels.last7Settled"),
        value: signedCurrencyFromDecimal(st.last7.net),
        hint: tr("kpiCards:settled.hints.last7", {
          recAmt: currencyFromDecimal(st.last7.in),
          payAmt: currencyFromDecimal(st.last7.out),
        }),
      },
    ];
  }, [st, tr]);

  const autoKpis = context === "settled" ? settledKpis : cashflowKpis;

  const kpiPermission = useMemo(
    () => (context === "settled" ? ["view_settlement_kpis"] : ["view_cash_flow_kpis"]),
    [context],
  );

  const [expanded, setExpanded] = useState(false);

  const rightPlacement = (i: number) => {
    if (!expanded) return "lg:col-span-3";
    if (i === 0) return "lg:col-span-3 lg:col-start-7";
    if (i === 1) return "lg:col-span-3 lg:col-start-10";
    if (i === 2) return "lg:col-span-6 lg:col-start-7";
    return "lg:col-span-3 lg:col-start-7";
  };

  if (isMobile) {
    return (
      <section
        className="relative w-full max-w-full overflow-x-hidden
                   [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="grid grid-cols-12 gap-2 w-full max-w-full px-1">
          <PermissionMiddleware codeName={["view_bank"]} requireAll>
            <BanksTable
              expanded={expanded}
              onExpandedChange={setExpanded}
              selectedBankIds={selectedBankIds}
              active
              refreshKey={banksRefreshKey}
              onGoToBanks={goToBanks}
            />
          </PermissionMiddleware>
        </div>

        <PermissionMiddleware codeName={kpiPermission} requireAll>
          <div className="mt-2 w-full max-w-full px-1">
            <div
              className="flex w-full max-w-full items-stretch gap-2 overflow-x-auto overflow-y-hidden pb-1
                         [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {autoKpis.map((kpi) => (
                <div
                  key={kpi.key}
                  title={kpi.hint && !loading ? kpi.hint : undefined}
                  className="w-[78vw] max-w-[220px] flex-shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-wide text-gray-600">
                      {kpi.label}
                    </span>
                    {kpi.delta && (
                      <span
                        className={`shrink-0 whitespace-nowrap text-[10px] ${
                          kpi.delta.positive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {kpi.delta.value}
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 text-base font-semibold leading-5 text-gray-800 tabular-nums">
                    {loading ? "—" : kpi.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PermissionMiddleware>
      </section>
    );
  }

  return (
    <section className="relative max-h-[35vh]">
      <LayoutGroup>
        <motion.div
          layout
          className={`grid grid-cols-12 gap-3 w-full ${expanded ? "grid-rows-[100px_100px] auto-rows-[100px]" : ""}`}
          transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
        >
          <PermissionMiddleware codeName={["view_bank"]} requireAll>
            <BanksTable
              expanded={expanded}
              onExpandedChange={setExpanded}
              selectedBankIds={selectedBankIds}
              active
              refreshKey={banksRefreshKey}
              onGoToBanks={goToBanks}
            />
          </PermissionMiddleware>

          <PermissionMiddleware codeName={kpiPermission} requireAll>
            <>
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
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {loading ? tr("kpiCards:loading") : kpi.hint}
                    </div>
                  )}
                </motion.div>
              ))}
            </>
          </PermissionMiddleware>
        </motion.div>
      </LayoutGroup>
    </section>
  );
};

export default KpiCards;

/* --------------------------------------------------------------------------
 * File: src/components/Table/BanksTable/index.tsx
 * Updates requested:
 * - Collapsed card on mobile (xs): show ONLY consolidated balance (no accounts count, no top bank)
 * - Mobile: hide scrollbars (banks list scroll still works, but scrollbar invisible)
 * - Desktop: unchanged behavior/layout
 * -------------------------------------------------------------------------- */

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

import Spinner from "@/components/ui/Loaders/Spinner";
import { formatCurrency } from "@/lib";
import { api } from "@/api/requests";

import type { BankAccountTableRow, GetBanksTableResponse } from "@/models/settings/banking";
import type { ApiSuccess } from "@/models/Api";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && typeof err.message === "string") return err.message;
  if (isRecord(err)) {
    const msg = err["message"];
    if (typeof msg === "string") return msg;
    const detail = err["detail"];
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

function toKey(v: unknown) {
  return String(v ?? "");
}

function getInitials(name: string) {
  if (!name) return "BK";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

type BanksTableProps = {
  /** FilterBar selection (ids). If empty, fetch all. */
  selectedBankIds?: Array<string | number>;
  active?: boolean;

  /** External refresh token to refetch. */
  refreshKey?: number;

  /** Controls expanded state (KpiCards keeps layout). */
  expanded: boolean;
  onExpandedChange(next: boolean): void;

  onGoToBanks?(): void;
};

type State = {
  banks: BankAccountTableRow[];
  count: number;
  total: number;
  loading: boolean;
  error: string | null;
};

const BanksTable: React.FC<BanksTableProps> = ({
  selectedBankIds,
  active = true,
  refreshKey = 0,
  expanded,
  onExpandedChange,
  onGoToBanks,
}) => {
  const { t } = useTranslation(["banksTable", "kpiCards"]);

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

  const hideScrollbarCls = useMemo(() => {
    if (!isMobile) return "";
    return "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
  }, [isMobile]);

  const ids = useMemo(() => {
    const raw = Array.isArray(selectedBankIds) ? selectedBankIds : [];
    return raw.map(toKey).filter(Boolean).sort();
  }, [selectedBankIds]);

  const idsKey = useMemo(() => ids.join(","), [ids]);

  const [state, setState] = useState<State>({
    banks: [],
    count: 0,
    total: 0,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      setState((p) => ({ ...p, loading: true, error: null }));

      try {
        const res: ApiSuccess<GetBanksTableResponse> = await api.getBanksTable({
          active,
          ids: ids.length ? ids : [],
        });

        if (!alive) return;

        const payload = res.data;

        const banks = Array.isArray(payload?.banks) ? payload.banks : [];
        const count = Number(payload?.count ?? banks.length) || banks.length;

        const totalN = Number(String(payload?.total_consolidated_balance ?? "0"));
        const total = Number.isFinite(totalN) ? totalN : 0;

        setState({
          banks,
          count,
          total,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (!alive) return;
        setState({
          banks: [],
          count: 0,
          total: 0,
          loading: false,
          error: getErrorMessage(err, t("banksTable:errors.loadEntryDetailsUnexpected", "Failed to load banks.")),
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [active, idsKey, ids, refreshKey, t]);

  const sorted = useMemo(
    () => state.banks.slice().sort((a, b) => a.institution.localeCompare(b.institution)),
    [state.banks],
  );

  const totalFmt = useMemo(() => formatCurrency(Number(state.total || 0)), [state.total]);

  const topBank = useMemo(() => {
    if (!sorted.length) return null;
    return [...sorted].sort((a, b) =>
      Number(a.consolidated_balance || 0) < Number(b.consolidated_balance || 0) ? 1 : -1,
    )[0];
  }, [sorted]);

  const handleGoToBanks = () => {
    if (onGoToBanks) return onGoToBanks();
    window.location.assign("/settings/banks");
  };

  return (
    <AnimatePresence initial={false}>
      {!expanded ? (
        <motion.button
          key="banks-card"
          layout
          transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
          onClick={() => onExpandedChange(true)}
          className="col-span-12 sm:col-span-6 lg:col-span-3 w-full max-w-full h-[70px] sm:h-[100px] border border-gray-300 rounded-md bg-white px-3 py-2 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300 overflow-hidden"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-gray-600">
              {t("kpiCards:panel.consolidatedBalance")}
            </span>

            {/* Desktop only: accounts count */}
            <span className="hidden sm:inline text-[11px] text-gray-500">
              {t("kpiCards:panel.accountsCount", { count: state.loading ? 0 : state.count || 0 })}
            </span>
          </div>

          <div className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">
            {state.loading ? "—" : totalFmt}
          </div>

          {/* Desktop only: top bank preview */}
          {!state.loading && topBank && (
            <div className="hidden sm:flex mt-1 items-center gap-2 min-w-0">
              <div className="h-6 w-6 shrink-0 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                {getInitials(topBank.institution)}
              </div>

              <div className="min-w-0">
                <div className="text-[12px] text-gray-800 truncate leading-tight">{topBank.institution}</div>
                <div className="text-[10px] text-gray-500 truncate leading-tight">
                  {formatCurrency(Number(topBank.consolidated_balance ?? 0))}
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
          className="col-span-12 lg:col-span-6 lg:col-start-1 row-span-2 w-full max-w-full h-[35vh] sm:h-full"
        >
          <div className="border border-gray-300 rounded-md bg-white overflow-hidden flex flex-col h-full w-full max-w-full">
            <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-300">
              <div className="text-[12px] text-gray-700">
                {t("kpiCards:panel.header")}{" "}
                <button
                  type="button"
                  onClick={handleGoToBanks}
                  className="font-semibold text-gray-800 tabular-nums px-1 -mx-1 rounded hover:text-gray-600 focus:outline-none transition"
                  aria-label={t("kpiCards:aria.goToBanks")}
                  title={t("kpiCards:aria.openBanks")}
                >
                  {state.loading ? "—" : totalFmt}
                </button>
              </div>

              <button
                className="text-[12px] px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-100"
                onClick={() => onExpandedChange(false)}
              >
                {t("kpiCards:actions.close")}
              </button>
            </div>

            {/* Hide scrollbar on mobile; keep scroll */}
            <div className={`flex-1 min-h-0 overflow-y-auto ${hideScrollbarCls}`}>
              {state.loading ? (
                <div
                  className="flex justify-center py-3"
                  role="status"
                  aria-live="polite"
                  aria-label={t("banksTable:aria.loading")}
                >
                  <Spinner />
                </div>
              ) : state.error ? (
                <div className="text-red-600 text-xs px-3 py-2">{state.error}</div>
              ) : (
                <section aria-label={t("banksTable:aria.section")} className="h-full flex flex-col bg-white">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-300 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-gray-600">
                        {t("banksTable:labels.banks")}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {t("banksTable:labels.count", { count: state.count || sorted.length })}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600">
                      {t("banksTable:labels.total")}{" "}
                      <span className="font-semibold text-gray-800 tabular-nums">{totalFmt}</span>
                    </div>
                  </div>

                  <div className={`flex-1 min-h-0 overflow-y-auto divide-y divide-gray-200 ${hideScrollbarCls}`}>
                    {sorted.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-600 text-center">{t("banksTable:empty")}</div>
                    ) : (
                      sorted.map((bank) => {
                        const balance = formatCurrency(Number(bank.consolidated_balance || 0));
                        return (
                          <div
                            key={bank.id}
                            role="listitem"
                            className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 focus-within:bg-gray-50"
                            aria-label={t("banksTable:aria.row", {
                              bank: bank.institution,
                              branch: bank.branch,
                              account: bank.account_number,
                              balance,
                            })}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 shrink-0 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                                {getInitials(bank.institution)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] text-gray-800 truncate leading-tight">
                                  {bank.institution}
                                </span>

                                {/* Desktop only: branch/account line */}
                                <span className="hidden sm:block text-[10px] text-gray-500 truncate leading-tight">
                                  {t("banksTable:labels.branchAccount", {
                                    branch: bank.branch,
                                    account: bank.account_number,
                                  })}
                                </span>
                              </div>
                            </div>

                            <div className="ml-3 shrink-0 text-[13px] font-semibold text-gray-800 tabular-nums">
                              {balance}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BanksTable;

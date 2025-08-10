/* --------------------------------------------------------------------------
 * File: src/components/KPI/KpiWithBanksRow.tsx
 * Banks acts like a KPI; on click expands into LEFT 50%.
 * Other KPI cards move to RIGHT 50% with two-on-first-row + one-on-second-row.
 * Single scrollbar owned by BanksTable.
 * -------------------------------------------------------------------------- */
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useBanks } from "@/hooks/useBanks";
import BanksTable from "src/components/Table/BanksTable";

export type KpiItem = {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; positive?: boolean };
};

interface KpiWithBanksRowProps {
  items: KpiItem[];
  selectedBankIds?: number[];
}

function getInitials(name: string) {
  if (!name) return "BK";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const KpiWithBanksRow: React.FC<KpiWithBanksRowProps> = ({ items, selectedBankIds }) => {
  const { banks, totalConsolidatedBalance } = useBanks(selectedBankIds);
  const [expanded, setExpanded] = useState(false);

  const totalFmt = useMemo(
    () =>
      (totalConsolidatedBalance || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [totalConsolidatedBalance]
  );

  const topBank = useMemo(() => {
    if (!banks?.length) return null;
    return [...banks].sort(
      (a, b) =>
        Number(b.consolidated_balance || 0) - Number(a.consolidated_balance || 0)
    )[0];
  }, [banks]);

  // Helper for positioning KPI cards on the RIGHT side when expanded
  const rightPlacement = (i: number) => {
    if (!expanded) return "lg:col-span-3"; // default grid
    if (i === 0) return "lg:col-span-3 lg:col-start-7";     // top-left of right half
    if (i === 1) return "lg:col-span-3 lg:col-start-10";    // top-right of right half
    if (i === 2) return "lg:col-span-6 lg:col-start-7";     // second row, full right half
    // fallback (if more KPIs exist)
    return "lg:col-span-3 lg:col-start-7";
  };

  return (
    <section className="relative max-h-[35vh]">
      <LayoutGroup>
        <motion.div
            layout
            className={`grid grid-cols-12 gap-3 w-full ${
              expanded ? "grid-rows-[100px_100px] auto-rows-[100px]" : ""
            }`}
            transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
          >
          {/* Banks KPI card / expanded panel rendered first */}
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
                    Saldo total
                  </span>
                  <span className="text-[11px] text-gray-500">{banks.length || 0}</span>
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">
                  {totalFmt}
                </div>
                {topBank && (
                  <div className="mt-1 flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 shrink-0 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                      {getInitials(topBank.bank_institution)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] text-gray-800 truncate leading-tight">
                        {topBank.bank_institution}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate leading-tight">
                        {Number(topBank.consolidated_balance || 0).toLocaleString(
                          "pt-BR",
                          { style: "currency", currency: "BRL" }
                        )}
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
                  {/* topo fixo */}
                  <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-300">
                    <div className="text-[12px] text-gray-700">
                      Bancos • Total:{" "}
                      <span className="font-semibold text-gray-800 tabular-nums">{totalFmt}</span>
                    </div>
                    <button
                      className="text-[12px] px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-100"
                      onClick={() => setExpanded(false)}
                    >
                      Fechar
                    </button>
                  </div>

                  {/* área rolável (único scrollbar) */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <BanksTable selectedBankIds={selectedBankIds} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KPI cards on the RIGHT side (two on first row, one on second) */}
          {items.map((kpi, i) => (
            <motion.div
              key={kpi.key}
              layout
              transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
              className={`col-span-12 sm:col-span-6 ${rightPlacement(i)} h-[100px] border border-gray-300 rounded-md bg-white px-3 py-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-600">
                  {kpi.label}
                </span>
                {kpi.delta && (
                  <span
                    className={`text-[11px] ${kpi.delta.positive ? "text-green-600" : "text-red-600"}`}
                  >
                    {kpi.delta.value}
                  </span>
                )}
              </div>
              <div className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">
                {kpi.value}
              </div>
              {kpi.hint && (
                <div className="mt-0.5 text-[11px] text-gray-500">{kpi.hint}</div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </LayoutGroup>
    </section>
  );
};

export default KpiWithBanksRow;
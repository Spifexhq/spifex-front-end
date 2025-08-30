/* --------------------------------------------------------------------------
 * File: BanksTable.tsx (compact)
 * Non-table list, minimal + intuitive. Slightly reduced heights.
 * -------------------------------------------------------------------------- */
import React from "react";
import { InlineLoader } from "@/components/Loaders";
import type { BankAccount } from "@/models/enterprise_structure/domain";

interface BanksTableProps {
  banks: BankAccount[];
  totalConsolidatedBalance: number;
  loading: boolean;
  error: string | null;
}

function getInitials(name: string) {
  if (!name) return "BK";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const BanksTable: React.FC<BanksTableProps> = ({
  banks,
  totalConsolidatedBalance,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <InlineLoader color="orange" />
      </div>
    );
  }
  if (error) return <div className="text-red-600 text-xs">{error}</div>;

  const totalFmt = Number(totalConsolidatedBalance || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const sorted = banks.slice().sort((a, b) => a.institution.localeCompare(b.institution));

  return (
    <section aria-label="Bancos e saldos" className="h-full flex flex-col bg-white">
      {/* Header (no scroll) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-gray-600">Bancos</span>
          <span className="text-[10px] text-gray-500">({banks.length})</span>
        </div>
        <div className="text-[11px] text-gray-600">
          Total: <span className="font-semibold text-gray-800 tabular-nums">{totalFmt}</span>
        </div>
      </div>

      {/* Scroll area (fills remaining height) */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-200">
        {sorted.length === 0 ? (
          <div className="px-4 py-3 text-xs text-gray-600 text-center">Nenhum banco disponível</div>
        ) : (
          sorted.map((bank) => {
            const balance = Number(bank.consolidated_balance || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            });
            return (
              <div
                key={bank.id}
                role="listitem"
                className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 focus-within:bg-gray-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 shrink-0 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                    {getInitials(bank.institution)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] text-gray-800 truncate leading-tight">{bank.institution}</span>
                    <span className="text-[10px] text-gray-500 truncate leading-tight">
                      Agência {bank.branch} • Conta {bank.account_number}
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
  );
};

export default BanksTable;

import React from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import { formatDateFromISO } from "@/lib";

type MiniItem = {
  id: string;
  date: string;
  desc: string;
  amount: number;
  tx_type?: number;
};

type Props = {
  counts?: {
    overdue_items: number;
    next7_items: number;
    next30_items: number;
  };
  largestOverduePay?: MiniItem | null;
  largestOverdueRec?: MiniItem | null;
  nextDueItems?: MiniItem[];
  settlementRate: number;
  avgMonthlyOutflowAbs: number;
  mtdNet: number;
};

const ReportsAttentionPanel: React.FC<Props> = ({
  counts,
  largestOverduePay,
  largestOverdueRec,
  nextDueItems = [],
  settlementRate,
  avgMonthlyOutflowAbs,
  mtdNet,
}) => {
  return (
    <section className="border border-gray-300 rounded-md bg-white px-3 py-2">
      <div className="mb-4">
        <p className="text-[12px] font-medium text-gray-900">Attention center</p>
        <p className="mt-1 text-[11px] text-gray-500">
          Quick operational signals around overdue and near-term cash movement
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-[11px] text-gray-500">Overdue</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{counts?.overdue_items ?? 0}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-[11px] text-gray-500">Next 7d</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{counts?.next7_items ?? 0}</p>
        </div>
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-[11px] text-gray-500">Next 30d</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{counts?.next30_items ?? 0}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-md border border-red-100 bg-red-50 p-3">
          <p className="text-xs text-red-700">Largest overdue payable</p>
          <p className="mt-1 text-sm font-semibold text-red-900">{largestOverduePay?.desc || "—"}</p>
          <div className="mt-1 flex items-center justify-between text-xs text-red-700">
            <span>{largestOverduePay?.date ? formatDateFromISO(largestOverduePay.date) : "—"}</span>
            <span>{largestOverduePay ? formatCurrency(largestOverduePay.amount) : "—"}</span>
          </div>
        </div>

        <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs text-blue-700">Largest overdue receivable</p>
          <p className="mt-1 text-sm font-semibold text-blue-900">{largestOverdueRec?.desc || "—"}</p>
          <div className="mt-1 flex items-center justify-between text-xs text-blue-700">
            <span>{largestOverdueRec?.date ? formatDateFromISO(largestOverdueRec.date) : "—"}</span>
            <span>{largestOverdueRec ? formatCurrency(largestOverdueRec.amount) : "—"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Settlement rate</p>
          <p className="text-sm font-semibold text-gray-900">{(settlementRate * 100).toFixed(1)}%</p>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gray-900" style={{ width: `${Math.max(0, Math.min(100, settlementRate * 100))}%` }} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-gray-50 p-2">
            <span className="text-gray-500">Avg burn</span>
            <p className="mt-1 font-semibold text-gray-900">{formatCurrency(avgMonthlyOutflowAbs)}</p>
          </div>
          <div className="rounded-md bg-gray-50 p-2">
            <span className="text-gray-500">MTD net</span>
            <p className={`mt-1 font-semibold ${mtdNet >= 0 ? "text-green-600" : "text-red-600"}`}>
              {mtdNet >= 0 ? "+" : ""}
              {formatCurrency(mtdNet)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">Next due items</p>
        <div className="space-y-2">
          {nextDueItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
              No upcoming due items.
            </div>
          ) : (
            nextDueItems.map((item) => (
              <div key={item.id} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.desc}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDateFromISO(item.date)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ReportsAttentionPanel;

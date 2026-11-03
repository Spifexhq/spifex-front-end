import React from "react";
import SectionCard from "./SectionCard";
import { fmtMoney } from "../helpers";

type MiniItem = {
  id: string;
  dateLabel: string;
  desc: string;
  amount: number;
};

type Props = {
  counts: {
    overdue_items: number;
    next7_items: number;
    next30_items: number;
  };
  largestOverduePay: MiniItem | null;
  largestOverdueRec: MiniItem | null;
  upcomingItems: MiniItem[];
  settlementRate: number;
  avgMonthlyOutflowAbs: number;
  mtdNet: number;
};

const AttentionPanel: React.FC<Props> = ({
  counts,
  largestOverduePay,
  largestOverdueRec,
  upcomingItems,
  settlementRate,
  avgMonthlyOutflowAbs,
  mtdNet,
}) => {
  return (
    <SectionCard title="Attention center" subtitle="Priority signals for the next decisions">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-gray-200 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Overdue</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{counts.overdue_items}</p>
        </div>
        <div className="rounded-md border border-gray-200 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Next 7d</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{counts.next7_items}</p>
        </div>
        <div className="rounded-md border border-gray-200 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Next 30d</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{counts.next30_items}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-red-700">Largest overdue payable</p>
          <p className="mt-1 text-[13px] font-medium text-red-900">{largestOverduePay?.desc || "—"}</p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-red-700">
            <span>{largestOverduePay?.dateLabel || "—"}</span>
            <span>{largestOverduePay ? fmtMoney(largestOverduePay.amount) : "—"}</span>
          </div>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-blue-700">Largest overdue receivable</p>
          <p className="mt-1 text-[13px] font-medium text-blue-900">{largestOverdueRec?.desc || "—"}</p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-blue-700">
            <span>{largestOverdueRec?.dateLabel || "—"}</span>
            <span>{largestOverdueRec ? fmtMoney(largestOverdueRec.amount) : "—"}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-gray-200 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Settlement rate</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{(settlementRate * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-md border border-gray-200 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Avg monthly outflow</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{fmtMoney(avgMonthlyOutflowAbs)}</p>
        </div>
      </div>

      <div className="mt-2 rounded-md border border-gray-200 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-gray-500">MTD net</p>
        <p className={`mt-1 text-base font-semibold ${mtdNet >= 0 ? "text-[#0E9384]" : "text-[#D92D20]"}`}>
          {mtdNet >= 0 ? "+" : ""}{fmtMoney(mtdNet)}
        </p>
      </div>

      <div className="mt-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-gray-500">Upcoming due items</p>
        <div className="space-y-2">
          {upcomingItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
              No upcoming due items.
            </div>
          ) : (
            upcomingItems.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-md border border-gray-200 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-gray-900">{item.desc}</p>
                    <p className="mt-1 text-[11px] text-gray-500">{item.dateLabel}</p>
                  </div>
                  <p className="shrink-0 text-[13px] font-medium text-gray-900">{fmtMoney(item.amount)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default AttentionPanel;

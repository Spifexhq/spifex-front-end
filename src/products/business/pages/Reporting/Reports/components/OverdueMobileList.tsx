import React from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import { TX_CREDIT, TX_DEBIT } from "../helpers";

type Item = {
  id: string;
  dateLabel: string;
  desc: string;
  amountNum: number;
  txTypeNum: number;
};

const OverdueMobileList: React.FC<{
  title: string;
  items: Item[];
}> = ({ title, items }) => {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-400">Highest overdue entries requiring attention</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No overdue items
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isPay = item.txTypeNum === TX_DEBIT;
            const isReceive = item.txTypeNum === TX_CREDIT;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.desc || "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{item.dateLabel}</p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      isPay
                        ? "bg-rose-50 text-rose-700"
                        : isReceive
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isPay ? "Pay" : isReceive ? "Receive" : "Other"}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <span className="text-xs text-slate-500">Amount</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatCurrency(item.amountNum)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OverdueMobileList;
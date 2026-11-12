import React from "react";
import SectionCard from "./SectionCard";
import Badge from "@/shared/ui/Badge";
import { fmtMoney, TX_CREDIT, TX_DEBIT } from "../helpers";

type Item = {
  id: string;
  dateLabel: string;
  desc: string;
  amount: number;
  tx_type?: number;
};

const OverdueListCard: React.FC<{
  title: string;
  subtitle: string;
  items: Item[];
}> = ({ title, subtitle, items }) => {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">
            No overdue items found.
          </div>
        ) : (
          items.map((item) => {
            const isPay = item.tx_type === TX_DEBIT;
            const isReceive = item.tx_type === TX_CREDIT;

            return (
              <article key={item.id} className="rounded-md border border-gray-200 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-gray-900">{item.desc || "—"}</p>
                    <p className="mt-1 text-[11px] text-gray-500">{item.dateLabel}</p>
                  </div>
                  <Badge tone={isPay ? "danger" : isReceive ? "info" : "neutral"}>
                    {isPay ? "Pay" : isReceive ? "Receive" : "Other"}
                  </Badge>
                </div>

                <div className="mt-2 text-right text-[13px] font-semibold text-gray-900">
                  {fmtMoney(item.amount)}
                </div>
              </article>
            );
          })
        )}
      </div>
    </SectionCard>
  );
};

export default OverdueListCard;

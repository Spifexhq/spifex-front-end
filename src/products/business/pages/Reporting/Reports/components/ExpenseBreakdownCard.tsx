import React from "react";
import SectionCard from "./SectionCard";
import { fmtMoney } from "../helpers";

type PieRow = {
  name: string;
  value: number;
  color: string;
};

const ExpenseBreakdownCard: React.FC<{
  title: string;
  subtitle: string;
  rows: PieRow[];
}> = ({ title, subtitle, rows }) => {
  const total = rows.reduce((acc, row) => acc + row.value, 0);

  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No expense concentration found.</p>
        ) : (
          rows.map((row) => {
            const pct = total > 0 ? (row.value / total) * 100 : 0;
            return (
              <div key={row.name} className="rounded-md border border-gray-200 px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    <p className="truncate text-[13px] text-gray-900">{row.name}</p>
                  </div>
                  <p className="shrink-0 text-[13px] font-medium text-gray-900">{fmtMoney(row.value)}</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: row.color }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">{pct.toFixed(1)}%</p>
              </div>
            );
          })
        )}
      </div>
    </SectionCard>
  );
};

export default ExpenseBreakdownCard;

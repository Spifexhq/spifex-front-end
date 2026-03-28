import React from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import { asPct } from "../helpers";
import SectionCard from "./SectionCard";

type Props = {
  consolidatedBalance: number;
  avgMonthlyOutflowAbs: number;
  runwayMonths: number;
  settlementRate: number;
  insights: string[];
};

const LiquidityAndInsights: React.FC<Props> = ({
  consolidatedBalance,
  avgMonthlyOutflowAbs,
  runwayMonths,
  settlementRate,
  insights,
}) => {
  return (
    <SectionCard title="Liquidity" subtitle="Balance, burn and operational signals" bodyClassName="px-3 py-2">
      <div className="space-y-3">
        <div className="rounded-md border border-gray-200 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-600">Consolidated balance</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{formatCurrency(consolidatedBalance)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-gray-200 px-3 py-2">
            <p className="text-[11px] text-gray-500">Avg monthly outflow</p>
            <p className="mt-1 text-[15px] font-semibold text-[#D92D20] tabular-nums">-{formatCurrency(avgMonthlyOutflowAbs)}</p>
          </div>
          <div className="rounded-md border border-gray-200 px-3 py-2">
            <p className="text-[11px] text-gray-500">Runway</p>
            <p className="mt-1 text-[15px] font-semibold text-gray-900 tabular-nums">
              {Number.isFinite(runwayMonths) ? `${runwayMonths.toFixed(1)} mo` : "—"}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500">Settlement rate</p>
            <p className="text-[13px] font-semibold text-gray-900">{asPct(settlementRate)}</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gray-900" style={{ width: `${Math.max(0, Math.min(100, settlementRate * 100))}%` }} />
          </div>
        </div>

        {insights.length > 0 && (
          <div className="space-y-2 border-t border-gray-200 pt-2">
            {insights.map((item, idx) => (
              <div key={`${item}-${idx}`} className="rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-700">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default LiquidityAndInsights;

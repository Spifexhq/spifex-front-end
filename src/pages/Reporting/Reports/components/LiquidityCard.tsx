import React from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";

type Props = {
  consolidatedBalance: number;
  avgMonthlyOutflow: number;
  runwayMonths: number;
  settlementRate: number;
};

const LiquidityCard: React.FC<Props> = ({
  consolidatedBalance,
  avgMonthlyOutflow,
  runwayMonths,
  settlementRate,
}) => {
  const settlementPct = Math.max(0, Math.min(100, settlementRate * 100));
  const runwayTone =
    Number.isFinite(runwayMonths) && runwayMonths < 3
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <p className="text-sm font-medium text-slate-900">Liquidity snapshot</p>
        <p className="mt-1 text-xs text-slate-400">Balance, burn, runway and settlement efficiency</p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Available balance</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {formatCurrency(consolidatedBalance)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Avg monthly outflow</p>
            <p className="mt-2 text-lg font-semibold text-rose-600">
              {formatCurrency(avgMonthlyOutflow)}
            </p>
          </div>

          <div className={`rounded-2xl border p-3 ${runwayTone}`}>
            <p className="text-xs">Estimated runway</p>
            <p className="mt-2 text-lg font-semibold">
              {Number.isFinite(runwayMonths) ? `${runwayMonths.toFixed(1)} mo` : "—"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Settlement rate</p>
            <p className="text-sm font-semibold text-slate-900">
              {settlementPct.toFixed(1)}%
            </p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-500"
              style={{ width: `${settlementPct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiquidityCard;
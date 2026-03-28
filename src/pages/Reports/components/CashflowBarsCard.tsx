import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from "recharts";
import { formatCurrency } from "@/lib/currency/formatCurrency";

type Row = {
  key: string;
  month: string;
  inflow: number;
  outflow: number;
  net: number;
};

const CashflowBarsCard: React.FC<{
  title: string;
  subtitle?: string;
  data: Row[];
}> = ({ title, subtitle, data }) => {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
      </div>

      <div className="h-[280px] sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={80}
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              contentStyle={{
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
              }}
            />
            <Bar dataKey="inflow" name="Inflow" fill="#2563eb" radius={[8, 8, 0, 0]} />
            <Bar dataKey="outflow" name="Outflow" fill="#ef4444" radius={[8, 8, 0, 0]} />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="#0f766e"
              strokeWidth={3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default CashflowBarsCard;
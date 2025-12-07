import React, { useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";

import { formatCurrency } from "src/lib";

type Datum = { month: string | number; cumulative: number };

export interface CumulativeAreaChartProps {
  data: Datum[];
  title?: string;
  height?: number; // default 256
  className?: string;
}

/* ---- Tokens -------------------------------------------------------------- */
const C_PRIMARY = "#F97316"; // orange-500
const C_AXIS = "#111827"; // gray-900

const fmtMoney = (v: number) => formatCurrency(v);

/* Minimal hover tooltip (no cursor line) */
type HoverTipPayload = Array<{ value?: number | string; name?: string; color?: string }>;

const HoverTip: React.FC<{
  active?: boolean;
  payload?: HoverTipPayload;
  label?: string | number;
  title?: string;
}> = ({ active, payload = [], label, title }) => {
  if (!active || payload.length === 0) return null;

  const p = payload[0];
  const value = typeof p?.value === "number" ? fmtMoney(p.value) : String(p?.value ?? "");

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        padding: "6px 8px",
        borderRadius: 8,
        fontSize: 12,
        color: "#111827",
        boxShadow: "0 6px 18px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)",
        transform: "translateY(-6px)",
        pointerEvents: "none",
      }}
      role="status"
      aria-live="polite"
    >
      {title ? <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div> : null}
      {label != null ? (
        <div style={{ color: "#6B7280", marginBottom: 4 }}>{String(label)}</div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, background: C_PRIMARY, borderRadius: 2 }} />
        <span style={{ color: "#374151" }}>Cumulativo:</span>
        <span className="tabular-nums">{value}</span>
      </div>
    </div>
  );
};

/** We only need activeLabel from the Recharts pointer state */
type ChartPointerState = {
  activeLabel?: string | number | null;
} | null;

const CumulativeAreaChart: React.FC<CumulativeAreaChartProps> = ({
  data,
  title,
  height = 256,
  className,
}) => {
  /* ---------------------- Selection state (click & drag) ---------------------- */
  const [dragStart, setDragStart] = useState<string | number | null>(null);
  const [dragEnd, setDragEnd] = useState<string | number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clearSelection = useCallback(() => {
    setDragStart(null);
    setDragEnd(null);
    setIsDragging(false);
  }, []);

  const labelIndex = useCallback(
    (label: string | number | null) =>
      label == null ? -1 : data.findIndex((d) => d.month === label),
    [data]
  );

  // inclusive bounds (sorted by X order)
  const [x1, x2] = useMemo(() => {
    const i1 = labelIndex(dragStart);
    const i2 = labelIndex(dragEnd);
    if (i1 < 0 || i2 < 0) return [null, null] as const;
    const [a, b] = [Math.min(i1, i2), Math.max(i1, i2)];
    return [data[a]?.month ?? null, data[b]?.month ?? null] as const;
  }, [dragStart, dragEnd, data, labelIndex]);

  // Δ = cum[j] - cum[i-1]  (if i === 0, just cum[j])
  const intervalSum = useMemo(() => {
    if (x1 == null || x2 == null) return null;
    const i = data.findIndex((d) => d.month === x1);
    const j = data.findIndex((d) => d.month === x2);
    if (i < 0 || j < 0) return null;

    const startIdx = Math.min(i, j);
    const endIdx = Math.max(i, j);
    const endVal = data[endIdx]?.cumulative ?? 0;
    const prevVal = startIdx > 0 ? data[startIdx - 1]?.cumulative ?? 0 : 0;
    return endVal - prevVal;
  }, [x1, x2, data]);

  /* ----------------------- Interaction handlers ----------------------- */
  const handleMouseDown = useCallback(
    (state: ChartPointerState) => {
      const label = state?.activeLabel ?? null;

      // clicking in empty region clears selection
      if (label == null) {
        clearSelection();
        return;
      }

      setDragStart(label);
      setDragEnd(label);
      setIsDragging(true);
    },
    [clearSelection]
  );

  const handleMouseMove = useCallback((state: ChartPointerState) => {
    if (!isDragging) return;
    const label = state?.activeLabel ?? null;
    if (label != null) setDragEnd(label);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseLeave = useCallback(() => setIsDragging(false), []);

  /* --------------------------- X ticks control --------------------------- */
  const ticks = useMemo(() => {
    if (!data?.length) return [];
    const len = data.length;
    if (len <= 8) return data.map((d) => d.month);

    const step = Math.ceil(len / 8);
    const sampled = data.filter((_, i) => i % step === 0).map((d) => d.month);
    if (sampled[sampled.length - 1] !== data[len - 1].month) sampled.push(data[len - 1].month);
    return sampled;
  }, [data]);

  const yFormatter = useMemo(() => (v: number) => fmtMoney(v), []);

  const noSelect: React.CSSProperties = {
    userSelect: "none",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    msUserSelect: "none",
  };

  return (
    <div
      className={className}
      role="group"
      aria-label={title || "Cumulative area chart"}
      tabIndex={0}
      onKeyDown={(e) => {
        if (!data?.length) return;
        if (e.key === "Escape") clearSelection();
      }}
      style={{ outline: "none", ...noSelect }}
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el?.closest?.(".cum-area-chart") == null && (x1 || x2)) clearSelection();
      }}
    >
      {title ? <p className="text-[12px] font-medium mb-3">{title}</p> : null}

      <div className="w-full cum-area-chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="cumFillOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_PRIMARY} stopOpacity={0.24} />
                <stop offset="85%" stopColor={C_PRIMARY} stopOpacity={0.06} />
                <stop offset="100%" stopColor={C_PRIMARY} stopOpacity={0} />
              </linearGradient>
              <filter id="softY" x="-10%" y="-10%" width="120%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
              </filter>
            </defs>

            <XAxis
              dataKey="month"
              ticks={ticks}
              interval="preserveStartEnd"
              minTickGap={16}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              tick={{ fill: C_AXIS, fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              tick={{ fill: C_AXIS, fontSize: 12 }}
              tickFormatter={yFormatter}
              width={72}
            />

            {x1 != null && x2 != null ? (
              <ReferenceArea x1={x1} x2={x2} strokeOpacity={0} fill={C_PRIMARY} fillOpacity={0.08} />
            ) : null}

            <Tooltip
              content={({ active, payload, label }) => (
                <HoverTip
                  active={active}
                  payload={payload as HoverTipPayload}
                  label={label}
                  title={title}
                />
              )}
              cursor={false}
              isAnimationActive
              wrapperStyle={{ pointerEvents: "none" }}
            />

            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={C_PRIMARY}
              strokeWidth={2}
              fill="url(#cumFillOrange)"
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
              style={{ filter: "url(#softY)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {x1 != null && x2 != null && intervalSum != null && (
        <div className="mt-2 inline-flex items-center gap-2 text-[12px] px-2 py-1 rounded-md border border-gray-200 bg-white shadow-sm">
          <span className="inline-flex w-2 h-2 rounded-sm" style={{ background: C_PRIMARY }} />
          <span>Período selecionado:</span>
          <strong className="tabular-nums">{fmtMoney(intervalSum)}</strong>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Limpar seleção"
            title="Limpar seleção"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
};

export default CumulativeAreaChart;

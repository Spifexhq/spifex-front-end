import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import SectionCard from "./SectionCard";
import type { DonutRange } from "../helpers";

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 78;
const STROKE = 28;

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

type Props = {
  title: string;
  subtitle?: string;
  ranges: Record<string, DonutRange>;
  defaultRange?: string;
};

const AnimatedDonutChart: React.FC<Props> = ({ title, subtitle, ranges, defaultRange }) => {
  const [activeRange, setActiveRange] = useState(defaultRange ?? Object.keys(ranges)[0]);
  const [displayTotal, setDisplayTotal] = useState(0);
  const prevItemsRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const [renderItems, setRenderItems] = useState(ranges[activeRange]?.items ?? []);
  const current = ranges[activeRange] ?? Object.values(ranges)[0];
  const tabs = useMemo(() => Object.keys(ranges), [ranges]);

  useEffect(() => {
    const next = current.items;
    const prev = prevItemsRef.current.length ? prevItemsRef.current : next.map(() => 0);
    const maxLen = Math.max(prev.length, next.length);
    const start = performance.now();
    const dur = 480;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
      const items = Array.from({ length: maxLen }, (_, i) => {
        const prevVal = prev[i] ?? 0;
        const nextItem = next[i];
        const nextVal = nextItem?.value ?? 0;
        return {
          name: nextItem?.name ?? `item-${i}`,
          color: nextItem?.color ?? "#9CA3AF",
          value: prevVal + (nextVal - prevVal) * e,
        };
      }).filter((item) => item.value > 0.01);

      setRenderItems(items);
      setDisplayTotal(items.reduce((acc, item) => acc + item.value, 0));
      if (p < 1) rafRef.current = requestAnimationFrame(frame);
      else prevItemsRef.current = next.map((item) => item.value);
    };

    rafRef.current = requestAnimationFrame(frame);
  }, [current]);

  const total = displayTotal || renderItems.reduce((acc, item) => acc + item.value, 0);
  let cursor = 0;

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      right={
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveRange(tab)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150 ${
                activeRange === tab
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-transparent text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      }
      bodyClassName="px-3 py-2"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto h-[240px] w-[240px]">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block h-full w-full">
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F3F4F6" strokeWidth={STROKE} />
            {renderItems.map((item) => {
              const pct = total > 0 ? item.value / total : 0;
              const startAngle = cursor * 360;
              const endAngle = (cursor + pct) * 360;
              cursor += pct;
              return (
                <path
                  key={item.name}
                  d={arcPath(CX, CY, R, startAngle, endAngle)}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Total</div>
              <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{formatCurrency(total)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {renderItems.length === 0 ? (
            <div className="text-sm text-gray-500">No data available.</div>
          ) : (
            renderItems.map((item) => {
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.name} className="rounded-md border border-gray-200 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <p className="truncate text-[13px] text-gray-900">{item.name}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">{pct.toFixed(1)}%</p>
                    </div>
                    <p className="tabular-nums text-[13px] font-semibold text-gray-900">{formatCurrency(item.value)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default AnimatedDonutChart;

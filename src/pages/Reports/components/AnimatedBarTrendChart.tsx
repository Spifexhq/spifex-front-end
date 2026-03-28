import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import SectionCard from "./SectionCard";
import type { BarTrendRange } from "../helpers";

const W = 700;
const H = 260;
const PL = 62;
const PR = 16;
const PT = 16;
const PB = 38;
const CW = W - PL - PR;
const CH = H - PT - PB;
const NS = "http://www.w3.org/2000/svg";

function svgEl(tag: string, attrs: Record<string, string> = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function getTickIndexes(total: number) {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i);
  const target = total <= 12 ? 6 : 8;
  const out = new Set<number>([0, total - 1]);
  for (let i = 1; i < target - 1; i += 1) out.add(Math.round(((total - 1) * i) / (target - 1)));
  return Array.from(out).sort((a, b) => a - b);
}

type Props = {
  title: string;
  subtitle?: string;
  ranges: Record<string, BarTrendRange>;
  defaultRange?: string;
};

const AnimatedBarTrendChart: React.FC<Props> = ({ title, subtitle, ranges, defaultRange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevRef = useRef<BarTrendRange | null>(null);
  const rafRef = useRef<number | null>(null);
  const [activeRange, setActiveRange] = useState(defaultRange ?? Object.keys(ranges)[0]);
  const current = ranges[activeRange] ?? Object.values(ranges)[0];
  const tabs = useMemo(() => Object.keys(ranges), [ranges]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !current || !current.labels.length) return;

    const prev = prevRef.current ?? {
      labels: current.labels,
      inflow: current.inflow.map(() => 0),
      outflow: current.outflow.map(() => 0),
      net: current.net.map(() => 0),
    };

    const maxLen = current.labels.length;
    const paddedPrev = {
      inflow: Array.from({ length: maxLen }, (_, i) => prev.inflow[i] ?? 0),
      outflow: Array.from({ length: maxLen }, (_, i) => prev.outflow[i] ?? 0),
      net: Array.from({ length: maxLen }, (_, i) => prev.net[i] ?? 0),
    };

    const allValues = [...current.inflow, ...current.outflow, ...current.net, 0];
    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...current.net, 0);
    const pad = Math.max((maxVal - minVal) * 0.12, 1);
    const top = maxVal + pad;
    const bottom = Math.min(0, minVal - pad);
    const scaleY = (v: number) => PT + CH * (1 - (v - bottom) / Math.max(top - bottom, 1));
    const zeroY = scaleY(0);
    const step = CW / Math.max(current.labels.length, 1);
    const centerX = (i: number) => PL + step * i + step / 2;
    const groupWidth = Math.min(step * 0.68, 48);
    const barGap = 4;
    const barW = Math.max(8, (groupWidth - barGap) / 2);

    svg.innerHTML = "";

    [top, bottom + (top - bottom) / 2, bottom].forEach((v) => {
      const y = scaleY(v);
      svg.append(
        svgEl("line", {
          x1: String(PL),
          y1: String(y),
          x2: String(W - PR),
          y2: String(y),
          stroke: "rgba(17,24,39,0.06)",
          "stroke-width": "1",
        })
      );
      const text = svgEl("text", {
        x: String(PL - 8),
        y: String(y + 4),
        "text-anchor": "end",
        "font-size": "10",
        fill: "rgba(17,24,39,0.45)",
        "font-family": "system-ui",
      });
      text.textContent = formatCurrency(v);
      svg.append(text);
    });

    getTickIndexes(current.labels.length).forEach((i) => {
      const text = svgEl("text", {
        x: String(centerX(i)),
        y: String(H - 8),
        "text-anchor": "middle",
        "font-size": "10",
        fill: "rgba(17,24,39,0.45)",
        "font-family": "system-ui",
      });
      text.textContent = current.labels[i];
      svg.append(text);
    });

    const path = svgEl("path", {
      fill: "none",
      stroke: "#0E9384",
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    svg.append(path);

    const dotGroup = svgEl("g");
    svg.append(dotGroup);

    const barGroups = current.labels.map((_, i) => {
      const group = svgEl("g");
      const inRect = svgEl("rect", { rx: "4", fill: "#0B5FFF" });
      const outRect = svgEl("rect", { rx: "4", fill: "#D92D20" });
      const dot = svgEl("circle", { r: "3", fill: "#0E9384" });
      group.append(inRect, outRect, dot);
      svg.append(group);
      return { inRect, outRect, dot };
    });

    const tooltip = svgEl("g", { opacity: "0" });
    const ttRect = svgEl("rect", { rx: "6", width: "140", height: "58", fill: "#fff", stroke: "rgba(17,24,39,0.08)" });
    const ttDate = svgEl("text", { x: "8", y: "14", "font-size": "10", fill: "rgba(17,24,39,0.45)", "font-family": "system-ui" });
    const ttLine1 = svgEl("text", { x: "8", y: "30", "font-size": "10", fill: "#0B5FFF", "font-family": "system-ui" });
    const ttLine2 = svgEl("text", { x: "8", y: "42", "font-size": "10", fill: "#D92D20", "font-family": "system-ui" });
    const ttLine3 = svgEl("text", { x: "8", y: "54", "font-size": "10", fill: "#0E9384", "font-family": "system-ui" });
    tooltip.append(ttRect, ttDate, ttLine1, ttLine2, ttLine3);
    svg.append(tooltip);

    const render = (progress: number) => {
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      const pts: string[] = [];
      current.labels.forEach((_, i) => {
        const inflow = paddedPrev.inflow[i] + (current.inflow[i] - paddedPrev.inflow[i]) * eased;
        const outflow = paddedPrev.outflow[i] + (current.outflow[i] - paddedPrev.outflow[i]) * eased;
        const net = paddedPrev.net[i] + (current.net[i] - paddedPrev.net[i]) * eased;
        const cx = centerX(i);

        const inHeight = Math.max(1, zeroY - scaleY(inflow));
        const outHeight = Math.max(1, zeroY - scaleY(outflow));

        barGroups[i].inRect.setAttribute("x", String(cx - barGap / 2 - barW));
        barGroups[i].inRect.setAttribute("y", String(zeroY - inHeight));
        barGroups[i].inRect.setAttribute("width", String(barW));
        barGroups[i].inRect.setAttribute("height", String(inHeight));

        barGroups[i].outRect.setAttribute("x", String(cx + barGap / 2));
        barGroups[i].outRect.setAttribute("y", String(zeroY - outHeight));
        barGroups[i].outRect.setAttribute("width", String(barW));
        barGroups[i].outRect.setAttribute("height", String(outHeight));

        barGroups[i].dot.setAttribute("cx", String(cx));
        barGroups[i].dot.setAttribute("cy", String(scaleY(net)));

        pts.push(`${i === 0 ? "M" : "L"}${cx} ${scaleY(net)}`);
      });
      path.setAttribute("d", pts.join(" "));
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const dur = 480;
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      render(p);
      if (p < 1) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    const hit = svgEl("rect", { x: String(PL), y: "0", width: String(CW), height: String(H), fill: "transparent", style: "cursor:crosshair" });
    svg.append(hit);

    const onMove = (evt: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const rawX = (evt.clientX - rect.left) * (W / rect.width);
      const idx = Math.max(0, Math.min(current.labels.length - 1, Math.round((rawX - PL - step / 2) / step)));
      const cx = centerX(idx);
      const anchorY = Math.min(scaleY(current.net[idx]), zeroY - Math.max(12, current.inflow[idx] > 0 ? (zeroY - scaleY(current.inflow[idx])) : 0));
      ttDate.textContent = current.labels[idx];
      ttLine1.textContent = `Inflow: ${formatCurrency(current.inflow[idx])}`;
      ttLine2.textContent = `Outflow: ${formatCurrency(current.outflow[idx])}`;
      ttLine3.textContent = `Net: ${formatCurrency(current.net[idx])}`;
      let tx = cx + 10;
      let ty = anchorY - 66;
      if (tx + 140 > W - PR) tx = cx - 150;
      if (ty < 0) ty = anchorY + 10;
      tooltip.setAttribute("transform", `translate(${tx},${ty})`);
      tooltip.setAttribute("opacity", "1");
    };
    const onLeave = () => tooltip.setAttribute("opacity", "0");
    hit.addEventListener("mousemove", onMove as EventListener);
    hit.addEventListener("mouseleave", onLeave as EventListener);

    prevRef.current = current;

    return () => {
      hit.removeEventListener("mousemove", onMove as EventListener);
      hit.removeEventListener("mouseleave", onLeave as EventListener);
    };
  }, [current]);

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
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#0B5FFF]" /> Inflow</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#D92D20]" /> Outflow</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0E9384]" /> Net</span>
      </div>
      <div className="relative h-[260px] w-full overflow-hidden">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="block h-full w-full" />
      </div>
    </SectionCard>
  );
};

export default AnimatedBarTrendChart;

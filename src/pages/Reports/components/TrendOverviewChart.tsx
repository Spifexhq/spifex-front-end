"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";

type ChartRange = {
  labels: string[];
  data: number[];
};

type ChartStats = {
  volume?: string;
  openInterest?: string;
  expires?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  unit?: string;
  ranges: Record<string, ChartRange>;
  defaultRange?: string;
  stats?: ChartStats;
  summaryValue?: number;
  summaryDiff?: number;
};

const W = 760;
const H = 240;
const PL = 56;
const PR = 18;
const PT = 18;
const PB = 30;
const CW = W - PL - PR;
const CH = H - PT - PB;
const NS = "http://www.w3.org/2000/svg";
const SAMPLES = 120;

function svgEl(tag: string, attrs: Record<string, string> = {}) {
  const e = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scaleX(i: number, n: number) {
  return PL + CW * (i / Math.max(n - 1, 1));
}

function scaleY(v: number, mn: number, mx: number) {
  if (mx === mn) return PT + CH / 2;
  return PT + CH * (1 - (v - mn) / (mx - mn));
}

function formatAxisCurrency(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? "-" : ""}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${value < 0 ? "-" : ""}${(abs / 1_000).toFixed(1)}K`;
  return Math.round(value).toString();
}

function splineAt(pts: [number, number][], t: number, axis: 0 | 1) {
  const n = pts.length;
  const seg = Math.min(Math.floor(t * Math.max(n - 1, 1)), Math.max(n - 2, 0));
  const lt = t * Math.max(n - 1, 1) - seg;
  const p0 = pts[Math.max(seg - 1, 0)];
  const p1 = pts[seg];
  const p2 = pts[Math.min(seg + 1, n - 1)];
  const p3 = pts[Math.min(seg + 2, n - 1)];
  const cp1 = p1[axis] + (p2[axis] - p0[axis]) / 6;
  const cp2 = p2[axis] - (p3[axis] - p1[axis]) / 6;
  const u = 1 - lt;
  return u ** 3 * p1[axis] + 3 * u ** 2 * lt * cp1 + 3 * u * lt ** 2 * cp2 + lt ** 3 * p2[axis];
}

function buildSamples(data: number[]) {
  const minVal = Math.min(...data, 0);
  const maxVal = Math.max(...data, 0);
  const pad = Math.max((maxVal - minVal) * 0.18, 1);
  const mn = minVal - pad;
  const mx = maxVal + pad;
  const rawPts: [number, number][] = data.map((v, i) => [scaleX(i, data.length), scaleY(v, mn, mx)]);
  const samples: [number, number][] = Array.from({ length: SAMPLES }, (_, s) => {
    const t = s / (SAMPLES - 1);
    return [splineAt(rawPts, t, 0), splineAt(rawPts, t, 1)];
  });
  return { samples, rawPts, mn, mx };
}

function samplesToPath(spts: [number, number][]) {
  return spts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
}

function lerpSamples(a: [number, number][], b: [number, number][], t: number): [number, number][] {
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
}

function sampleIndexFromClientX(clientX: number, rect: DOMRect) {
  const svgX = (clientX - rect.left) * (W / rect.width);
  const ratio = clamp((svgX - PL) / CW, 0, 1);
  const sampleIdx = Math.round(ratio * (SAMPLES - 1));
  return clamp(sampleIdx, 0, SAMPLES - 1);
}

function dataIndexFromSample(sampleIdx: number, dataLength: number) {
  if (dataLength <= 1) return 0;
  const ratio = sampleIdx / (SAMPLES - 1);
  return clamp(Math.round(ratio * (dataLength - 1)), 0, dataLength - 1);
}

const TrendOverviewChart: React.FC<Props> = ({
  title,
  subtitle,
  unit = "",
  ranges,
  defaultRange = "12M",
  stats,
  summaryValue = 0,
  summaryDiff = 0,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafMorphRef = useRef<number | null>(null);
  const [activeRange, setActiveRange] = useState(defaultRange);
  const [displayValue, setDisplayValue] = useState(summaryValue);
  const [displayDiff, setDisplayDiff] = useState(summaryDiff);
  const [isHovering, setIsHovering] = useState(false);

  const curSamples = useRef<[number, number][]>([]);
  const curData = useRef<number[]>([]);
  const curLabels = useRef<string[]>([]);
  const nodes = useRef<{
    linePath: SVGElement | null;
    fillPath: SVGElement | null;
    stop: SVGElement | null;
    marker: SVGElement | null;
    tooltip: SVGElement | null;
    tooltipDate: SVGElement | null;
    tooltipValue: SVGElement | null;
    hit: SVGElement | null;
  }>({
    linePath: null,
    fillPath: null,
    stop: null,
    marker: null,
    tooltip: null,
    tooltipDate: null,
    tooltipValue: null,
    hit: null,
  });

  const lineColor = displayDiff >= 0 ? "#0E9384" : "#D92D20";

  const resetHeader = useCallback(() => {
    const data = curData.current;
    if (!data.length) return;
    setDisplayValue(data[data.length - 1]);
    setDisplayDiff(data[data.length - 1] - data[0]);
    setIsHovering(false);
    nodes.current.marker?.setAttribute("opacity", "0");
    nodes.current.tooltip?.setAttribute("opacity", "0");
  }, []);

  const morphTo = useCallback(
    (newData: number[], newLabels: string[]) => {
      if (!curSamples.current.length) return;
      const fromSamples = [...curSamples.current];
      const { samples: toSamples } = buildSamples(newData);
      const color = newData[newData.length - 1] >= newData[0] ? "#0E9384" : "#D92D20";

      if (rafMorphRef.current) cancelAnimationFrame(rafMorphRef.current);

      const t0 = performance.now();
      const duration = 420;

      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
        const interp = lerpSamples(fromSamples, toSamples, e);
        const lineD = samplesToPath(interp);
        const fillD = `${lineD} L${interp[interp.length - 1][0]} ${H - PB} L${interp[0][0]} ${H - PB} Z`;

        nodes.current.linePath?.setAttribute("d", lineD);
        nodes.current.fillPath?.setAttribute("d", fillD);
        nodes.current.linePath?.setAttribute("stroke", color);
        nodes.current.stop?.setAttribute("stop-color", color);

        if (p < 1) {
          rafMorphRef.current = requestAnimationFrame(step);
        } else {
          curSamples.current = toSamples;
          curData.current = newData;
          curLabels.current = newLabels;
          resetHeader();
        }
      };

      rafMorphRef.current = requestAnimationFrame(step);
    },
    [resetHeader]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const fallback = ranges[defaultRange] ?? Object.values(ranges)[0];
    if (!fallback || !fallback.data.length) return;

    svg.innerHTML = "";
    curData.current = fallback.data;
    curLabels.current = fallback.labels;

    const { samples, mn, mx } = buildSamples(fallback.data);
    curSamples.current = samples;

    const color = fallback.data[fallback.data.length - 1] >= fallback.data[0] ? "#0E9384" : "#D92D20";

    const defs = svgEl("defs");
    const grad = svgEl("linearGradient", { id: "reportsTrendGrad", x1: "0", y1: "0", x2: "0", y2: "1" });
    const stop0 = svgEl("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.18" });
    const stop1 = svgEl("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" });
    grad.append(stop0, stop1);
    defs.append(grad);
    svg.append(defs);

    [mn, (mn + mx) / 2, mx].forEach((v) => {
      const y = scaleY(v, mn, mx);
      svg.append(
        svgEl("line", {
          x1: String(PL),
          y1: String(y),
          x2: String(W - PR),
          y2: String(y),
          stroke: "rgba(17,24,39,0.08)",
          "stroke-width": "1",
        })
      );

      const txt = svgEl("text", {
        x: String(PL - 8),
        y: String(y + 4),
        "text-anchor": "end",
        "font-size": "10",
        fill: "rgba(17,24,39,0.45)",
        "font-family": "system-ui",
      });
      txt.textContent = formatAxisCurrency(v);
      svg.append(txt);
    });

    fallback.labels.forEach((lbl, i) => {
      const len = fallback.labels.length;
      const always = len <= 6;
      const show = always || i === 0 || i === len - 1 || i === Math.floor(len / 2) || i % 2 === 0;
      if (show) {
        const txt = svgEl("text", {
          x: String(scaleX(i, len)),
          y: String(H - 6),
          "text-anchor": "middle",
          "font-size": "10",
          fill: "rgba(17,24,39,0.45)",
          "font-family": "system-ui",
        });
        txt.textContent = lbl;
        svg.append(txt);
      }
    });

    const lineD = samplesToPath(samples);
    const fillD = `${lineD} L${samples[samples.length - 1][0]} ${H - PB} L${samples[0][0]} ${H - PB} Z`;

    const fillPath = svgEl("path", { d: fillD, fill: "url(#reportsTrendGrad)" });
    const linePath = svgEl("path", {
      d: lineD,
      fill: "none",
      stroke: color,
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    svg.append(fillPath, linePath);

    const marker = svgEl("g", { opacity: "0", "pointer-events": "none" });
    marker.append(
      svgEl("circle", { r: "8", fill: color, opacity: "0.18" }),
      svgEl("circle", { r: "5", fill: "#fff", stroke: color, "stroke-width": "2" }),
      svgEl("circle", { r: "2.5", fill: color })
    );
    svg.append(marker);

    const tt = svgEl("g", { opacity: "0", "pointer-events": "none" });
    const ttRect = svgEl("rect", {
      rx: "10",
      ry: "10",
      fill: "#ffffff",
      stroke: "rgba(15,23,42,0.08)",
      "stroke-width": "1",
      width: "132",
      height: "52",
    });
    const ttDate = svgEl("text", {
      x: "10",
      y: "18",
      "font-size": "10",
      fill: "rgba(15,23,42,0.45)",
      "font-family": "system-ui",
    });
    const ttValue = svgEl("text", {
      x: "10",
      y: "36",
      "font-size": "14",
      "font-weight": "600",
      fill: "#111827",
      "font-family": "system-ui",
    });
    tt.append(ttRect, ttDate, ttValue);
    svg.append(tt);

    const hit = svgEl("rect", {
      x: String(PL),
      y: "0",
      width: String(CW),
      height: String(H),
      fill: "transparent",
      style: "cursor:crosshair",
    });

    hit.addEventListener("mousemove", (e: Event) => {
      const evt = e as MouseEvent;
      const rect = svg.getBoundingClientRect();
      const sampleIdx = sampleIndexFromClientX(evt.clientX, rect);
      const point = curSamples.current[sampleIdx];
      if (!point) return;

      const [x, y] = point;
      const idx = dataIndexFromSample(sampleIdx, curData.current.length);

      marker.setAttribute("transform", `translate(${x},${y})`);
      marker.setAttribute("opacity", "1");
      ttDate.textContent = curLabels.current[idx] ?? "";
      ttValue.textContent = formatCurrency(curData.current[idx] ?? 0);

      const ttWidth = 132;
      const ttHeight = 52;
      let tx = x + 12;
      let ty = y - 54;
      if (tx + ttWidth > W - PR) tx = x - ttWidth - 12;
      if (tx < PL) tx = PL;
      if (ty < PT) ty = y + 12;
      if (ty + ttHeight > H - PB) ty = H - PB - ttHeight;
      tt.setAttribute("transform", `translate(${tx},${ty})`);
      tt.setAttribute("opacity", "1");

      setDisplayValue(curData.current[idx] ?? 0);
      setDisplayDiff((curData.current[idx] ?? 0) - (curData.current[0] ?? 0));
      setIsHovering(true);
    });

    hit.addEventListener("mouseleave", () => resetHeader());

    svg.append(hit);
    nodes.current = { linePath, fillPath, stop: stop0, marker, tooltip: tt, tooltipDate: ttDate, tooltipValue: ttValue, hit };

    resetHeader();

    return () => {
      if (rafMorphRef.current) cancelAnimationFrame(rafMorphRef.current);
    };
  }, [ranges, defaultRange, resetHeader]);

  useEffect(() => {
    const next = ranges[activeRange];
    if (next?.data?.length) morphTo(next.data, next.labels);
  }, [activeRange, ranges, morphTo]);

  const summaryClass =
    displayDiff >= 0
      ? "bg-emerald-100 text-emerald-800"
      : "bg-red-100 text-red-700";

  return (
    <section className="border border-gray-300 rounded-md bg-white px-3 py-2">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[12px] font-medium text-gray-900">{title}</p>
          {subtitle ? <p className="mt-1 text-[11px] text-gray-500">{subtitle}</p> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[34px] font-semibold leading-none tabular-nums" style={{ color: lineColor }}>
              {formatCurrency(displayValue)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${summaryClass}`}>
                {displayDiff >= 0 ? "+" : ""}{formatCurrency(displayDiff)} {isHovering ? "range" : "period"}
              </span>
              <span className="text-[11px] text-gray-400">{unit}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {Object.keys(ranges).map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`text-xs px-3 py-1 rounded-full border transition-all duration-150 ${
                  activeRange === range
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-transparent text-gray-400 border-transparent hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full h-[240px]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible block"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-3.5 sm:grid-cols-3">
          {stats?.volume && <div><div className="text-[13px] font-medium text-gray-900">{stats.volume}</div><div className="text-[11px] text-gray-400 mt-0.5">Inflows</div></div>}
          {stats?.openInterest && <div><div className="text-[13px] font-medium text-gray-900">{stats.openInterest}</div><div className="text-[11px] text-gray-400 mt-0.5">Outflows</div></div>}
          {stats?.expires && <div><div className="text-[13px] font-medium text-gray-900">{stats.expires}</div><div className="text-[11px] text-gray-400 mt-0.5">Runway</div></div>}
        </div>
      </div>
    </section>
  );
};

export default TrendOverviewChart;

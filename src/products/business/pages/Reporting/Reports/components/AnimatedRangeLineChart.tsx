"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import SectionCard from "./SectionCard";
import type { ChartRange } from "../helpers";
import { compactCurrency, fmtMoney } from "../helpers";

type ChartStats = {
  inflow?: string;
  outflow?: string;
  context?: string;
};

type Props = {
  title: string;
  subLabel: string;
  ranges: Record<string, ChartRange>;
  defaultRange?: string;
  stats?: ChartStats;
};

const W = 720;
const H = 220;
const PL = 50;
const PR = 16;
const PT = 18;
const PB = 30;
const CW = W - PL - PR;
const CH = H - PT - PB;
const NS = "http://www.w3.org/2000/svg";
const SAMPLES = 120;

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {}
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scaleX(i: number, n: number) {
  if (n <= 1) return PL + CW / 2;
  return PL + CW * (i / (n - 1));
}

function scaleY(v: number, mn: number, mx: number) {
  if (mx === mn) return PT + CH / 2;
  return PT + CH * (1 - (v - mn) / (mx - mn));
}

function splineAt(pts: [number, number][], t: number, axis: 0 | 1): number {
  const n = pts.length;
  if (n <= 1) return pts[0]?.[axis] ?? 0;

  const seg = Math.min(Math.floor(t * (n - 1)), n - 2);
  const lt = t * (n - 1) - seg;
  const p0 = pts[Math.max(seg - 1, 0)];
  const p1 = pts[seg];
  const p2 = pts[seg + 1];
  const p3 = pts[Math.min(seg + 2, n - 1)];
  const cp1 = p1[axis] + (p2[axis] - p0[axis]) / 6;
  const cp2 = p2[axis] - (p3[axis] - p1[axis]) / 6;
  const u = 1 - lt;

  return (
    u ** 3 * p1[axis] +
    3 * u ** 2 * lt * cp1 +
    3 * u * lt ** 2 * cp2 +
    lt ** 3 * p2[axis]
  );
}

function buildSamples(data: number[]) {
  const minV = Math.min(...data, 0);
  const maxV = Math.max(...data, 0);
  const pad = Math.max((maxV - minV) * 0.18, 1);
  const mn = minV - pad;
  const mx = maxV + pad;

  const rawPts: [number, number][] = data.map((v, i) => [
    scaleX(i, data.length),
    scaleY(v, mn, mx),
  ]);

  const samples: [number, number][] = Array.from({ length: SAMPLES }, (_, s) => {
    const t = s / (SAMPLES - 1);
    return [splineAt(rawPts, t, 0), splineAt(rawPts, t, 1)];
  });

  return { samples, mn, mx, rawPts };
}

function samplesToPath(spts: [number, number][]) {
  return spts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
}

function lerpSamples(a: [number, number][], b: [number, number][], t: number): [number, number][] {
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  return pt.matrixTransform(ctm.inverse());
}

const AnimatedRangeLineChart: React.FC<Props> = ({
  title,
  subLabel,
  ranges,
  defaultRange = "12M",
  stats,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafMorphRef = useRef<number | null>(null);
  const rafSpringRef = useRef<number | null>(null);
  const rafSplitRef = useRef<number | null>(null);

  const [activeRange, setActiveRange] = useState(defaultRange);
  const [displayValue, setDisplayValue] = useState(0);
  const [displayDiff, setDisplayDiff] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const spring = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    alpha: 0,
    targetAlpha: 0,
  });

  const splitRef = useRef({ t: 1, target: 1 });

  const curSamples = useRef<[number, number][]>([]);
  const curRawPts = useRef<[number, number][]>([]);
  const curData = useRef<number[]>([]);
  const curLabels = useRef<string[]>([]);
  const curDomain = useRef({ mn: 0, mx: 1 });
  const curRangeKey = useRef(defaultRange);
  const isBuilt = useRef(false);

  const h = useRef({
    dotG: null as SVGGElement | null,
    vline: null as SVGLineElement | null,
    ttG: null as SVGGElement | null,
    ttRect: null as SVGRectElement | null,
    ttDate: null as SVGTextElement | null,
    ttVal: null as SVGTextElement | null,
    ttDir: null as SVGTextElement | null,
    coloredLine: null as SVGPathElement | null,
    grayLine: null as SVGPathElement | null,
    coloredFill: null as SVGPathElement | null,
    grayFill: null as SVGPathElement | null,
    coloredClipRect: null as SVGRectElement | null,
    grayClipRect: null as SVGRectElement | null,
    gradStop0: null as SVGStopElement | null,
    yTickTexts: [] as SVGTextElement[],
    yGridLines: [] as SVGLineElement[],
    xTicks: [] as SVGTextElement[],
  });

  const applySplit = useCallback((t: number) => {
    const splitX = PL + CW * t;
    h.current.coloredClipRect?.setAttribute("width", String(Math.max(0, splitX - PL)));
    h.current.grayClipRect?.setAttribute("x", String(splitX));
    h.current.grayClipRect?.setAttribute("width", String(Math.max(0, PL + CW - splitX)));
  }, []);

  const startSplitAnim = useCallback(() => {
    if (rafSplitRef.current) return;

    const tick = () => {
      const s = splitRef.current;
      const diff = s.target - s.t;

      if (Math.abs(diff) < 0.0015) {
        s.t = s.target;
        applySplit(s.t);
        rafSplitRef.current = null;
        return;
      }

      s.t += diff * 0.14;
      applySplit(s.t);
      rafSplitRef.current = requestAnimationFrame(tick);
    };

    rafSplitRef.current = requestAnimationFrame(tick);
  }, [applySplit]);

  const startSpring = useCallback(() => {
    if (rafSpringRef.current) return;

    const tick = () => {
      const s = spring.current;

      s.vx = (s.vx + (s.tx - s.x) * 0.22) * 0.72;
      s.vy = (s.vy + (s.ty - s.y) * 0.22) * 0.72;
      s.x += s.vx;
      s.y += s.vy;
      s.alpha += (s.targetAlpha - s.alpha) * 0.14;

      h.current.dotG?.setAttribute("transform", `translate(${s.x},${s.y})`);
      h.current.dotG?.setAttribute("opacity", String(s.alpha));

      if (h.current.vline) {
        h.current.vline.setAttribute("x1", String(s.x));
        h.current.vline.setAttribute("x2", String(s.x));
        h.current.vline.setAttribute("opacity", String(s.alpha * 0.7));
      }

      h.current.ttG?.setAttribute("opacity", String(s.alpha));

      const done =
        Math.abs(s.vx) < 0.05 &&
        Math.abs(s.vy) < 0.05 &&
        Math.abs(s.x - s.tx) < 0.2 &&
        Math.abs(s.y - s.ty) < 0.2 &&
        Math.abs(s.alpha - s.targetAlpha) < 0.01;

      if (done) {
        rafSpringRef.current = null;
        return;
      }

      rafSpringRef.current = requestAnimationFrame(tick);
    };

    rafSpringRef.current = requestAnimationFrame(tick);
  }, []);

  const resetHeader = useCallback(() => {
    const data = curData.current;
    if (!data.length) return;

    const last = data[data.length - 1];
    setDisplayValue(last);
    setDisplayDiff(last - data[0]);
    setIsHovering(false);
  }, []);

  const updateAxes = useCallback((labels: string[], mn: number, mx: number) => {
    const yVals = [mn, (mn + mx) / 2, mx];

    h.current.yTickTexts.forEach((tick, index) => {
      const y = scaleY(yVals[index], mn, mx);
      tick.setAttribute("x", String(PL - 8));
      tick.setAttribute("y", String(y + 4));
      tick.textContent = compactCurrency(yVals[index]);
    });

    h.current.yGridLines.forEach((line, index) => {
      const y = scaleY(yVals[index], mn, mx);
      line.setAttribute("x1", String(PL));
      line.setAttribute("y1", String(y));
      line.setAttribute("x2", String(W - PR));
      line.setAttribute("y2", String(y));
    });

    const maxXTicks = labels.length <= 4 ? labels.length : Math.min(labels.length, 6);
    const step = labels.length <= maxXTicks ? 1 : Math.ceil((labels.length - 1) / (maxXTicks - 1));
    const visibleIdx = new Set<number>();

    for (let i = 0; i < labels.length; i += step) visibleIdx.add(i);
    visibleIdx.add(labels.length - 1);

    const idxs = Array.from(visibleIdx).sort((a, b) => a - b);

    h.current.xTicks.forEach((tick, idx) => {
      const sourceIdx = idxs[idx];
      if (typeof sourceIdx === "undefined") {
        tick.setAttribute("opacity", "0");
        return;
      }

      tick.setAttribute("opacity", "1");
      tick.setAttribute("x", String(scaleX(sourceIdx, labels.length)));
      tick.setAttribute("y", String(H - 5));
      tick.textContent = labels[sourceIdx];
    });
  }, []);

  const morphTo = useCallback(
    (newData: number[], newLabels: string[]) => {
      if (!curSamples.current.length) return;

      const fromSamples = [...curSamples.current];
      const { samples: toSamples, rawPts, mn, mx } = buildSamples(newData);

      const isUpSeries = newData[newData.length - 1] >= newData[0];
      const lc = isUpSeries ? "#0E9384" : "#D92D20";
      const dur = 480;
      const t0 = performance.now();

      h.current.coloredLine?.setAttribute("stroke", lc);
      h.current.gradStop0?.setAttribute("stop-color", lc);

      const circles = h.current.dotG?.querySelectorAll("circle");
      if (circles) {
        circles[0].setAttribute("fill", lc);
        circles[2].setAttribute("fill", lc);
        circles[1].setAttribute("stroke", lc);
      }

      updateAxes(newLabels, mn, mx);

      if (rafMorphRef.current) cancelAnimationFrame(rafMorphRef.current);

      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = p < 0.5 ? 4 * p ** 3 : 1 - ((-2 * p + 2) ** 3) / 2;
        const interp = lerpSamples(fromSamples, toSamples, e);
        const lineD = samplesToPath(interp);
        const fillD = `${lineD} L${interp[interp.length - 1][0]} ${H - PB} L${interp[0][0]} ${H - PB} Z`;

        h.current.coloredLine?.setAttribute("d", lineD);
        h.current.grayLine?.setAttribute("d", lineD);
        h.current.coloredFill?.setAttribute("d", fillD);
        h.current.grayFill?.setAttribute("d", fillD);

        if (p < 1) {
          rafMorphRef.current = requestAnimationFrame(step);
          return;
        }

        curSamples.current = toSamples;
        curRawPts.current = rawPts;
        curData.current = newData;
        curLabels.current = newLabels;
        curDomain.current = { mn, mx };

        splitRef.current.target = 1;
        startSplitAnim();
        resetHeader();
      };

      rafMorphRef.current = requestAnimationFrame(step);
      spring.current.targetAlpha = 0;
      startSpring();
    },
    [resetHeader, startSpring, startSplitAnim, updateAxes]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg || !curRawPts.current.length || !curData.current.length) return;

      const svgPoint = getSvgPoint(svg, e.clientX, e.clientY);
      if (!svgPoint) return;

      const ratio = clamp((svgPoint.x - PL) / CW, 0, 1);
      const idx = clamp(
        Math.round(ratio * Math.max(curData.current.length - 1, 0)),
        0,
        Math.max(curData.current.length - 1, 0)
      );

      splitRef.current.target = ratio;
      startSplitAnim();

      const x = splineAt(curRawPts.current, ratio, 0);
      const y = splineAt(curRawPts.current, ratio, 1);

      spring.current.tx = x;
      spring.current.ty = y;
      spring.current.targetAlpha = 1;

      const value = curData.current[idx] ?? 0;
      const prev =
        idx > 0
          ? curData.current[idx - 1] ?? curData.current[0] ?? 0
          : curData.current[0] ?? 0;
      const diff = value - prev;
      const rangeDiff = value - (curData.current[0] ?? 0);

      if (h.current.ttDate) {
        h.current.ttDate.textContent = curLabels.current[idx] ?? "";
      }

      if (h.current.ttVal) {
        h.current.ttVal.textContent = fmtMoney(value);
      }

      if (h.current.ttDir) {
        h.current.ttDir.textContent = `${diff >= 0 ? "▲ +" : "▼ "}${fmtMoney(Math.abs(diff))}`;
        h.current.ttDir.setAttribute("fill", diff >= 0 ? "#0E9384" : "#D92D20");
      }

      const ttW = 152;
      const ttH = 62;

      h.current.ttRect?.setAttribute("width", String(ttW));
      h.current.ttRect?.setAttribute("height", String(ttH));

      h.current.ttDate?.setAttribute("x", "8");
      h.current.ttDate?.setAttribute("y", "16");

      h.current.ttVal?.setAttribute("x", "8");
      h.current.ttVal?.setAttribute("y", "34");

      h.current.ttDir?.setAttribute("x", "8");
      h.current.ttDir?.setAttribute("y", "50");
      h.current.ttDir?.setAttribute("text-anchor", "start");

      let ttx = x + 12;
      let tty = y - ttH - 8;

      if (ttx + ttW > W - PR) ttx = x - ttW - 12;
      if (ttx < PL) ttx = PL;
      if (tty < PT) tty = y + 12;
      if (tty + ttH > H - 4) tty = H - ttH - 4;

      h.current.ttG?.setAttribute("transform", `translate(${ttx},${tty})`);

      setDisplayValue(value);
      setDisplayDiff(rangeDiff);
      setIsHovering(true);
      startSpring();
    },
    [startSpring, startSplitAnim]
  );

  const onMouseLeave = useCallback(() => {
    splitRef.current.target = 1;
    startSplitAnim();
    spring.current.targetAlpha = 0;
    startSpring();
    resetHeader();
  }, [resetHeader, startSpring, startSplitAnim]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || isBuilt.current) return;

    const initial = ranges[defaultRange] ?? Object.values(ranges)[0];
    if (!initial || !initial.data.length) return;

    svg.innerHTML = "";
    curData.current = initial.data;
    curLabels.current = initial.labels;
    curRangeKey.current = defaultRange;

    const { samples, mn, mx, rawPts } = buildSamples(initial.data);
    curSamples.current = samples;
    curRawPts.current = rawPts;
    curDomain.current = { mn, mx };

    const isUpSeries = initial.data[initial.data.length - 1] >= initial.data[0];
    const lc = isUpSeries ? "#0E9384" : "#D92D20";
    const gc = "rgba(17,24,39,0.14)";

    const defs = svgEl("defs");
    const gradC = svgEl("linearGradient", {
      id: "reportsLineColoredGrad",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    const stop0 = svgEl("stop", { offset: "0%", "stop-color": lc, "stop-opacity": "0.16" });
    const stop1 = svgEl("stop", { offset: "100%", "stop-color": lc, "stop-opacity": "0" });
    gradC.append(stop0, stop1);

    const gradG = svgEl("linearGradient", {
      id: "reportsLineGrayGrad",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1",
    });
    gradG.append(
      svgEl("stop", { offset: "0%", "stop-color": "#111827", "stop-opacity": "0.05" }),
      svgEl("stop", { offset: "100%", "stop-color": "#111827", "stop-opacity": "0" })
    );

    const clipC = svgEl("clipPath", { id: "reportsLineClipColored" });
    const coloredCR = svgEl("rect", { x: String(PL), y: "0", width: String(CW), height: String(H) });
    clipC.append(coloredCR);

    const clipG = svgEl("clipPath", { id: "reportsLineClipGray" });
    const grayCR = svgEl("rect", { x: String(PL + CW), y: "0", width: "0", height: String(H) });
    clipG.append(grayCR);

    defs.append(gradC, gradG, clipC, clipG);
    svg.append(defs);

    h.current.gradStop0 = stop0;
    h.current.coloredClipRect = coloredCR;
    h.current.grayClipRect = grayCR;

    const yVals = [mn, (mn + mx) / 2, mx];

    h.current.yGridLines = yVals.map((v) => {
      const y = scaleY(v, mn, mx);
      const line = svgEl("line", {
        x1: String(PL),
        y1: String(y),
        x2: String(W - PR),
        y2: String(y),
        stroke: "rgba(17,24,39,0.08)",
        "stroke-width": "0.5",
      });
      svg.append(line);
      return line;
    });

    h.current.yTickTexts = yVals.map((v) => {
      const y = scaleY(v, mn, mx);
      const t = svgEl("text", {
        x: String(PL - 8),
        y: String(y + 4),
        "text-anchor": "end",
        "font-size": "9.5",
        fill: "rgba(17,24,39,0.38)",
        "font-family": "system-ui",
      });
      t.textContent = compactCurrency(v);
      svg.append(t);
      return t;
    });

    h.current.xTicks = Array.from({ length: 6 }, () => {
      const t = svgEl("text", {
        x: String(PL),
        y: String(H - 5),
        "text-anchor": "middle",
        "font-size": "9.5",
        fill: "rgba(17,24,39,0.38)",
        "font-family": "system-ui",
      });
      svg.append(t);
      return t;
    });

    updateAxes(initial.labels, mn, mx);

    const lineD = samplesToPath(samples);
    const fillD = `${lineD} L${samples[samples.length - 1][0]} ${H - PB} L${samples[0][0]} ${H - PB} Z`;

    const grayFill = svgEl("path", {
      d: fillD,
      fill: "url(#reportsLineGrayGrad)",
      "clip-path": "url(#reportsLineClipGray)",
    });

    const coloredFill = svgEl("path", {
      d: fillD,
      fill: "url(#reportsLineColoredGrad)",
      "clip-path": "url(#reportsLineClipColored)",
    });

    const grayLine = svgEl("path", {
      d: lineD,
      fill: "none",
      stroke: gc,
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "clip-path": "url(#reportsLineClipGray)",
    });

    const coloredLine = svgEl("path", {
      d: lineD,
      fill: "none",
      stroke: lc,
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "clip-path": "url(#reportsLineClipColored)",
    });

    svg.append(grayFill, coloredFill, grayLine, coloredLine);
    Object.assign(h.current, { grayFill, coloredFill, grayLine, coloredLine });

    const vline = svgEl("line", {
      x1: "0",
      y1: String(PT),
      x2: "0",
      y2: String(H - PB),
      stroke: "rgba(17,24,39,0.12)",
      "stroke-width": "1",
      "stroke-dasharray": "3 3",
      opacity: "0",
      "pointer-events": "none",
    });
    svg.append(vline);
    h.current.vline = vline;

    const dotG = svgEl("g", { opacity: "0", "pointer-events": "none" });
    dotG.append(
      svgEl("circle", { r: "8", fill: lc, opacity: "0.18" }),
      svgEl("circle", { r: "5", fill: "white", stroke: lc, "stroke-width": "2" }),
      svgEl("circle", { r: "2.5", fill: lc })
    );
    svg.append(dotG);
    h.current.dotG = dotG;

    const ttG = svgEl("g", { opacity: "0", "pointer-events": "none" });
    const ttRect = svgEl("rect", {
      rx: "8",
      fill: "#FFFFFF",
      stroke: "rgba(17,24,39,0.08)",
      "stroke-width": "0.5",
      width: "152",
      height: "62",
    });

    const ttDate = svgEl("text", {
      x: "8",
      y: "16",
      "font-size": "10",
      fill: "rgba(17,24,39,0.45)",
      "font-family": "system-ui",
    });

    const ttVal = svgEl("text", {
      x: "8",
      y: "34",
      "font-size": "14",
      "font-weight": "600",
      fill: "#111827",
      "font-family": "system-ui",
    });

    const ttDir = svgEl("text", {
      x: "8",
      y: "50",
      "font-size": "10.5",
      "font-weight": "600",
      "font-family": "system-ui",
      "text-anchor": "start",
    });

    ttG.append(ttRect, ttDate, ttVal, ttDir);
    svg.append(ttG);
    Object.assign(h.current, { ttG, ttRect, ttDate, ttVal, ttDir });

    const hit = svgEl("rect", {
      x: String(PL),
      y: "0",
      width: String(CW),
      height: String(H),
      fill: "transparent",
      style: "cursor:crosshair",
    });

    svg.append(hit);
    hit.addEventListener("mousemove", onMouseMove as EventListener);
    hit.addEventListener("mouseleave", onMouseLeave as EventListener);

    spring.current.x = rawPts[rawPts.length - 1][0];
    spring.current.y = rawPts[rawPts.length - 1][1];
    spring.current.alpha = 0;
    spring.current.targetAlpha = 0;

    splitRef.current = { t: 1, target: 1 };
    applySplit(1);

    isBuilt.current = true;
    resetHeader();

    return () => {
      hit.removeEventListener("mousemove", onMouseMove as EventListener);
      hit.removeEventListener("mouseleave", onMouseLeave as EventListener);

      if (rafMorphRef.current) cancelAnimationFrame(rafMorphRef.current);
      if (rafSpringRef.current) cancelAnimationFrame(rafSpringRef.current);
      if (rafSplitRef.current) cancelAnimationFrame(rafSplitRef.current);
    };
  }, [applySplit, defaultRange, onMouseLeave, onMouseMove, ranges, resetHeader, updateAxes]);

  useEffect(() => {
    if (!isBuilt.current) return;
    if (curRangeKey.current === activeRange) return;

    curRangeKey.current = activeRange;
    const next = ranges[activeRange];
    if (!next || !next.data.length) return;

    morphTo(next.data, next.labels);
  }, [activeRange, morphTo, ranges]);

  const isUp = displayDiff >= 0;
  const lineColor = isUp ? "#0E9384" : "#D92D20";

  return (
    <SectionCard
      title={title}
      subtitle={subLabel}
      right={
        <div className="flex gap-1">
          {Object.keys(ranges).map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                activeRange === range
                  ? "bg-gray-900 text-white"
                  : "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <span
          className="text-[28px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: lineColor }}
        >
          {fmtMoney(displayValue)}
        </span>

        <div
          className={`mb-0.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            isUp ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {isUp ? "+" : ""}
          {fmtMoney(Math.abs(displayDiff))}
          {isHovering ? " range" : " period"}
        </div>
      </div>

      <div className="relative h-[220px] w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-3">
        <div>
          <div className="text-[13px] font-medium text-gray-900">{stats?.inflow ?? "—"}</div>
          <div className="mt-0.5 text-[11px] text-gray-400">Inflow</div>
        </div>
        <div>
          <div className="text-[13px] font-medium text-gray-900">{stats?.outflow ?? "—"}</div>
          <div className="mt-0.5 text-[11px] text-gray-400">Outflow</div>
        </div>
        <div>
          <div className="text-[13px] font-medium text-gray-900">{stats?.context ?? "—"}</div>
          <div className="mt-0.5 text-[11px] text-gray-400">Context</div>
        </div>
      </div>
    </SectionCard>
  );
};

export default AnimatedRangeLineChart;
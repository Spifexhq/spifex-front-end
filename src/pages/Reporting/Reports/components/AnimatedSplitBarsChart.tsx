"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import SectionCard from "./SectionCard";
import type { SplitBarDatum } from "../helpers";
import { compactCurrency, fmtMoney } from "../helpers";

type Props = {
  title: string;
  subtitle: string;
  ranges: Record<string, SplitBarDatum[]>;
  defaultRange?: string;
};

const W = 700;
const H = 260;
const PL = 44;
const PR = 12;
const PT = 12;
const PB = 30;
const CW = W - PL - PR;
const CH = H - PT - PB;
const NS = "http://www.w3.org/2000/svg";

const BAR_INFLOW = "#0B5FFF";
const BAR_OUTFLOW = "#D92D20";
const LINE_NET = "#0E9384";
const GRID = "rgba(17,24,39,0.08)";
const AXIS = "rgba(17,24,39,0.38)";
const SAMPLES = 120;

type ChartSeriesPoint = {
  label: string;
  inflow: number;
  outflow: number;
  net: number;
};

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {}
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scaleX(i: number, n: number) {
  if (n <= 1) return PL + CW / 2;
  return PL + (CW * i) / (n - 1);
}

function scaleY(v: number, mn: number, mx: number) {
  if (mx === mn) return PT + CH / 2;
  return PT + CH * (1 - (v - mn) / (mx - mn));
}

function splineAt(pts: [number, number][], t: number, axis: 0 | 1): number {
  const n = pts.length;
  if (n === 1) return pts[0][axis];

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

function samplesToPath(samples: [number, number][]) {
  return samples.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpSamples(
  a: [number, number][],
  b: [number, number][],
  t: number
): [number, number][] {
  return a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]);
}

function normalizeRows(rows: SplitBarDatum[]): ChartSeriesPoint[] {
  return rows.map((row) => ({
    label: row.month,
    inflow: Math.abs(Number(row.inflow || 0)),
    outflow: Math.abs(Number(row.outflow || 0)),
    net: Number(row.net || 0),
  }));
}

function buildNetSamples(data: ChartSeriesPoint[], mn: number, mx: number) {
  const rawPts: [number, number][] = data.map((d, i) => [
    scaleX(i, data.length),
    scaleY(d.net, mn, mx),
  ]);

  const samples: [number, number][] = Array.from({ length: SAMPLES }, (_, s) => {
    const t = s / (SAMPLES - 1);
    return [splineAt(rawPts, t, 0), splineAt(rawPts, t, 1)];
  });

  return { rawPts, samples };
}

function buildGeometry(data: ChartSeriesPoint[]) {
  const maxPos = Math.max(
    1,
    ...data.flatMap((d) => [d.inflow, d.outflow, Math.max(d.net, 0)])
  );
  const minNeg = Math.min(0, ...data.map((d) => Math.min(d.net, 0)));
  const maxAbs = Math.max(maxPos, Math.abs(minNeg), 1);

  const mn = Math.min(-maxAbs * 1.1, 0);
  const mx = Math.max(maxAbs * 1.1, 1);

  const zeroY = scaleY(0, mn, mx);
  const step = data.length > 0 ? CW / Math.max(data.length, 1) : CW;
  const barWidth = Math.min(14, step / 4.2);

  const bars = data.map((d, i) => {
    const center = scaleX(i, data.length);
    const inflowTop = scaleY(d.inflow, mn, mx);
    const outflowTop = scaleY(d.outflow, mn, mx);
    const netY = scaleY(d.net, mn, mx);

    return {
      center,
      label: d.label,
      inflow: {
        x: center - barWidth * 1.5,
        y: inflowTop,
        width: barWidth,
        height: Math.max(0, zeroY - inflowTop),
      },
      outflow: {
        x: center - barWidth / 2,
        y: outflowTop,
        width: barWidth,
        height: Math.max(0, zeroY - outflowTop),
      },
      netBar:
        d.net >= 0
          ? {
              x: center + barWidth / 2,
              y: netY,
              width: barWidth,
              height: Math.max(0, zeroY - netY),
            }
          : {
              x: center + barWidth / 2,
              y: zeroY,
              width: barWidth,
              height: Math.max(0, netY - zeroY),
            },
    };
  });

  const { rawPts, samples } = buildNetSamples(data, mn, mx);

  return {
    mn,
    mx,
    zeroY,
    bars,
    rawPts,
    samples,
  };
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  return pt.matrixTransform(ctm.inverse());
}

const AnimatedSplitBarsChart: React.FC<Props> = ({
  title,
  subtitle,
  ranges,
  defaultRange = "12M",
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafMorphRef = useRef<number | null>(null);
  const rafSpringRef = useRef<number | null>(null);

  const [activeRange, setActiveRange] = useState(defaultRange);
  const [displayNet, setDisplayNet] = useState(0);
  const [displayDiff, setDisplayDiff] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const curData = useRef<ChartSeriesPoint[]>([]);
  const curBars = useRef<ReturnType<typeof buildGeometry>["bars"]>([]);
  const curRawPts = useRef<[number, number][]>([]);
  const curSamples = useRef<[number, number][]>([]);
  const curRangeKey = useRef(defaultRange);
  const isBuilt = useRef(false);

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

  const h = useRef({
    inflowRects: [] as SVGRectElement[],
    outflowRects: [] as SVGRectElement[],
    netRects: [] as SVGRectElement[],
    xLabels: [] as SVGTextElement[],
    yAxisLayer: null as SVGGElement | null,
    netLine: null as SVGPathElement | null,
    vline: null as SVGLineElement | null,
    dotG: null as SVGGElement | null,
    ttG: null as SVGGElement | null,
    ttRect: null as SVGRectElement | null,
    ttDate: null as SVGTextElement | null,
    ttVal: null as SVGTextElement | null,
    ttInOut: null as SVGTextElement | null,
    ttDiff: null as SVGTextElement | null,
    hit: null as SVGRectElement | null,
  });

  const resetHeader = useCallback(() => {
    const data = curData.current;
    if (!data.length) return;

    const last = data[data.length - 1].net;
    const first = data[0].net;
    setDisplayNet(last);
    setDisplayDiff(last - first);
    setIsHovering(false);
  }, []);

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

  const rebuildAxes = useCallback((mn: number, mx: number) => {
    const layer = h.current.yAxisLayer;
    if (!layer) return;

    layer.innerHTML = "";

    const ticks = [mx, (mx + 0) / 2, 0];

    ticks.forEach((tick) => {
      const y = scaleY(tick, mn, mx);

      const line = svgEl("line", {
        x1: String(PL),
        x2: String(W - PR),
        y1: String(y),
        y2: String(y),
        stroke: GRID,
        "stroke-width": "0.5",
      });

      const text = svgEl("text", {
        x: String(PL - 6),
        y: String(y + 3),
        "text-anchor": "end",
        "font-size": "9",
        fill: AXIS,
        "font-family": "system-ui",
      });

      text.textContent = compactCurrency(tick);
      layer.append(line, text);
    });

    const zeroY = scaleY(0, mn, mx);
    const zeroLine = svgEl("line", {
      x1: String(PL),
      x2: String(W - PR),
      y1: String(zeroY),
      y2: String(zeroY),
      stroke: "rgba(17,24,39,0.18)",
      "stroke-width": "0.8",
    });

    layer.append(zeroLine);
  }, []);

  const applyGeometry = useCallback(
    (geom: ReturnType<typeof buildGeometry>) => {
      const rowCount = geom.bars.length;

      for (let i = 0; i < rowCount; i += 1) {
        const row = geom.bars[i];
        const inflow = h.current.inflowRects[i];
        const outflow = h.current.outflowRects[i];
        const netRect = h.current.netRects[i];
        const label = h.current.xLabels[i];

        if (inflow) {
          inflow.setAttribute("x", String(row.inflow.x));
          inflow.setAttribute("y", String(row.inflow.y));
          inflow.setAttribute("width", String(row.inflow.width));
          inflow.setAttribute("height", String(row.inflow.height));
        }

        if (outflow) {
          outflow.setAttribute("x", String(row.outflow.x));
          outflow.setAttribute("y", String(row.outflow.y));
          outflow.setAttribute("width", String(row.outflow.width));
          outflow.setAttribute("height", String(row.outflow.height));
        }

        if (netRect) {
          netRect.setAttribute("x", String(row.netBar.x));
          netRect.setAttribute("y", String(row.netBar.y));
          netRect.setAttribute("width", String(row.netBar.width));
          netRect.setAttribute("height", String(row.netBar.height));
        }

        if (label) {
          label.setAttribute("x", String(row.center));
          label.textContent = row.label;
        }
      }

      h.current.netLine?.setAttribute("d", samplesToPath(geom.samples));
      rebuildAxes(geom.mn, geom.mx);

      curBars.current = geom.bars;
      curRawPts.current = geom.rawPts;
      curSamples.current = geom.samples;
    },
    [rebuildAxes]
  );

  const morphTo = useCallback(
    (nextRows: SplitBarDatum[]) => {
      const nextData = normalizeRows(nextRows);
      const nextGeom = buildGeometry(nextData);
      const prevBars = curBars.current;
      const prevSamples = curSamples.current;

      if (!prevBars.length || !prevSamples.length) {
        applyGeometry(nextGeom);
        curData.current = nextData;
        resetHeader();
        return;
      }

      const prevDomain = buildGeometry(curData.current);

      const fromBars = prevBars.map((row) => ({
        center: row.center,
        label: row.label,
        inflow: { ...row.inflow },
        outflow: { ...row.outflow },
        netBar: { ...row.netBar },
      }));

      const toBars = nextGeom.bars;
      const maxLen = Math.max(fromBars.length, toBars.length);
      const normFrom: typeof fromBars = [];
      const normTo: typeof toBars = [];

      for (let i = 0; i < maxLen; i += 1) {
        normFrom.push(
          fromBars[i] ??
            (fromBars[fromBars.length - 1] || {
              center: PL,
              label: "",
              inflow: { x: PL, y: H - PB, width: 0, height: 0 },
              outflow: { x: PL, y: H - PB, width: 0, height: 0 },
              netBar: { x: PL, y: H - PB, width: 0, height: 0 },
            })
        );

        normTo.push(
          toBars[i] ??
            (toBars[toBars.length - 1] || {
              center: PL,
              label: "",
              inflow: { x: PL, y: H - PB, width: 0, height: 0 },
              outflow: { x: PL, y: H - PB, width: 0, height: 0 },
              netBar: { x: PL, y: H - PB, width: 0, height: 0 },
            })
        );
      }

      const fromSamples =
        prevSamples.length === SAMPLES
          ? prevSamples
          : Array.from({ length: SAMPLES }, (_, i) => prevSamples[Math.min(i, prevSamples.length - 1)]);

      const toSamples =
        nextGeom.samples.length === SAMPLES
          ? nextGeom.samples
          : Array.from({ length: SAMPLES }, (_, i) => nextGeom.samples[Math.min(i, nextGeom.samples.length - 1)]);

      if (rafMorphRef.current) cancelAnimationFrame(rafMorphRef.current);

      const t0 = performance.now();
      const dur = 460;

      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;

        rebuildAxes(lerp(prevDomain.mn, nextGeom.mn, e), lerp(prevDomain.mx, nextGeom.mx, e));

        for (let i = 0; i < maxLen; i += 1) {
          const a = normFrom[i];
          const b = normTo[i];

          const inflow = h.current.inflowRects[i];
          const outflow = h.current.outflowRects[i];
          const netRect = h.current.netRects[i];
          const label = h.current.xLabels[i];

          if (inflow) {
            inflow.setAttribute("x", String(lerp(a.inflow.x, b.inflow.x, e)));
            inflow.setAttribute("y", String(lerp(a.inflow.y, b.inflow.y, e)));
            inflow.setAttribute("width", String(lerp(a.inflow.width, b.inflow.width, e)));
            inflow.setAttribute("height", String(lerp(a.inflow.height, b.inflow.height, e)));
          }

          if (outflow) {
            outflow.setAttribute("x", String(lerp(a.outflow.x, b.outflow.x, e)));
            outflow.setAttribute("y", String(lerp(a.outflow.y, b.outflow.y, e)));
            outflow.setAttribute("width", String(lerp(a.outflow.width, b.outflow.width, e)));
            outflow.setAttribute("height", String(lerp(a.outflow.height, b.outflow.height, e)));
          }

          if (netRect) {
            netRect.setAttribute("x", String(lerp(a.netBar.x, b.netBar.x, e)));
            netRect.setAttribute("y", String(lerp(a.netBar.y, b.netBar.y, e)));
            netRect.setAttribute("width", String(lerp(a.netBar.width, b.netBar.width, e)));
            netRect.setAttribute("height", String(lerp(a.netBar.height, b.netBar.height, e)));
          }

          if (label) {
            label.setAttribute("x", String(lerp(a.center, b.center, e)));
            label.textContent = b.label;
            label.setAttribute("opacity", "1");
          }
        }

        h.current.netLine?.setAttribute("d", samplesToPath(lerpSamples(fromSamples, toSamples, e)));

        if (p < 1) {
          rafMorphRef.current = requestAnimationFrame(step);
        } else {
          applyGeometry(nextGeom);
          curData.current = nextData;
          resetHeader();
        }
      };

      rafMorphRef.current = requestAnimationFrame(step);

      spring.current.targetAlpha = 0;
      startSpring();
    },
    [applyGeometry, rebuildAxes, resetHeader, startSpring]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg || !curData.current.length || !curRawPts.current.length) return;

      const svgPoint = getSvgPoint(svg, e.clientX, e.clientY);
      if (!svgPoint) return;

      const raw = clamp((svgPoint.x - PL) / CW, 0, 1);
      const idx = clamp(
        Math.round(raw * (curData.current.length - 1)),
        0,
        curData.current.length - 1
      );

      const s = spring.current;
      s.tx = splineAt(curRawPts.current, raw, 0);
      s.ty = splineAt(curRawPts.current, raw, 1);
      s.targetAlpha = 1;

      const row = curData.current[idx];
      const prev = idx > 0 ? curData.current[idx - 1].net : curData.current[0].net;
      const diff = row.net - prev;
      const rangeDiff = row.net - curData.current[0].net;

      if (h.current.ttDate) {
        h.current.ttDate.textContent = row.label;
      }

      if (h.current.ttVal) {
        h.current.ttVal.textContent = `Net ${fmtMoney(row.net)}`;
      }

      if (h.current.ttInOut) {
        h.current.ttInOut.textContent = `In ${fmtMoney(row.inflow)} • Out ${fmtMoney(row.outflow)}`;
      }

      if (h.current.ttDiff) {
        h.current.ttDiff.textContent = `${diff >= 0 ? "▲" : "▼"} ${fmtMoney(Math.abs(diff))}`;
        h.current.ttDiff.setAttribute("fill", diff >= 0 ? "#16a34a" : "#dc2626");
      }

      const ttW = 176;
      const ttH = 68;

      let ttx = s.tx + 12;
      let tty = s.ty - ttH - 8;

      if (ttx + ttW > W - PR) ttx = s.tx - ttW - 12;
      if (ttx < PL) ttx = PL;
      if (tty < PT) tty = s.ty + 12;
      if (tty + ttH > H - 4) tty = H - ttH - 4;

      h.current.ttRect?.setAttribute("width", String(ttW));
      h.current.ttRect?.setAttribute("height", String(ttH));

      h.current.ttDate?.setAttribute("x", "8");
      h.current.ttDate?.setAttribute("y", "16");

      h.current.ttVal?.setAttribute("x", "8");
      h.current.ttVal?.setAttribute("y", "32");

      h.current.ttInOut?.setAttribute("x", "8");
      h.current.ttInOut?.setAttribute("y", "48");

      h.current.ttDiff?.setAttribute("x", "8");
      h.current.ttDiff?.setAttribute("y", "62");

      h.current.ttG?.setAttribute("transform", `translate(${ttx},${tty})`);

      setDisplayNet(row.net);
      setDisplayDiff(rangeDiff);
      setIsHovering(true);
      startSpring();
    },
    [startSpring]
  );

  const onMouseLeave = useCallback(() => {
    spring.current.targetAlpha = 0;
    startSpring();
    resetHeader();
  }, [resetHeader, startSpring]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const initialRows = normalizeRows(ranges[defaultRange] ?? Object.values(ranges)[0] ?? []);
    const geom = buildGeometry(initialRows);

    svg.innerHTML = "";
    curData.current = initialRows;
    curRangeKey.current = defaultRange;

    const axisLayer = svgEl("g");
    svg.append(axisLayer);
    h.current.yAxisLayer = axisLayer;
    rebuildAxes(geom.mn, geom.mx);

    const plotLayer = svgEl("g");

    geom.bars.forEach((row) => {
      const inflow = svgEl("rect", {
        x: String(row.inflow.x),
        y: String(row.inflow.y),
        width: String(row.inflow.width),
        height: String(row.inflow.height),
        rx: "1.4",
        fill: BAR_INFLOW,
      });

      const outflow = svgEl("rect", {
        x: String(row.outflow.x),
        y: String(row.outflow.y),
        width: String(row.outflow.width),
        height: String(row.outflow.height),
        rx: "1.4",
        fill: BAR_OUTFLOW,
      });

      const netRect = svgEl("rect", {
        x: String(row.netBar.x),
        y: String(row.netBar.y),
        width: String(row.netBar.width),
        height: String(row.netBar.height),
        rx: "1.4",
        fill: LINE_NET,
      });

      const label = svgEl("text", {
        x: String(row.center),
        y: String(H - 7),
        "text-anchor": "middle",
        "font-size": "9",
        fill: AXIS,
        "font-family": "system-ui",
      });

      label.textContent = row.label;

      plotLayer.append(inflow, outflow, netRect, label);
      h.current.inflowRects.push(inflow);
      h.current.outflowRects.push(outflow);
      h.current.netRects.push(netRect);
      h.current.xLabels.push(label);
    });

    const netLine = svgEl("path", {
      d: samplesToPath(geom.samples),
      fill: "none",
      stroke: LINE_NET,
      "stroke-width": "2.2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });

    plotLayer.append(netLine);
    svg.append(plotLayer);

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

    const dotG = svgEl("g", { opacity: "0", "pointer-events": "none" });
    dotG.append(
      svgEl("circle", { r: "8", fill: LINE_NET, opacity: "0.18" }),
      svgEl("circle", { r: "5", fill: "white", stroke: LINE_NET, "stroke-width": "2" }),
      svgEl("circle", { r: "2.5", fill: LINE_NET })
    );

    const ttG = svgEl("g", { opacity: "0", "pointer-events": "none" });
    const ttRect = svgEl("rect", {
      rx: "6",
      fill: "#fff",
      stroke: "rgba(0,0,0,0.08)",
      "stroke-width": "0.5",
    });

    const ttDate = svgEl("text", {
      "font-size": "10",
      fill: "rgba(0,0,0,0.38)",
      "font-family": "system-ui",
    });

    const ttVal = svgEl("text", {
      "font-size": "13",
      "font-weight": "600",
      fill: "#111",
      "font-family": "system-ui",
    });

    const ttInOut = svgEl("text", {
      "font-size": "9.5",
      fill: "rgba(0,0,0,0.58)",
      "font-family": "system-ui",
    });

    const ttDiff = svgEl("text", {
      "font-size": "9.5",
      "font-weight": "600",
      "font-family": "system-ui",
    });

    ttG.append(ttRect, ttDate, ttVal, ttInOut, ttDiff);

    const hit = svgEl("rect", {
      x: String(PL),
      y: "0",
      width: String(CW),
      height: String(H),
      fill: "transparent",
      style: "cursor:crosshair",
    });

    svg.append(vline, dotG, ttG, hit);

    hit.addEventListener("mousemove", onMouseMove as EventListener);
    hit.addEventListener("mouseleave", onMouseLeave as EventListener);

    h.current.netLine = netLine;
    h.current.vline = vline;
    h.current.dotG = dotG;
    h.current.ttG = ttG;
    h.current.ttRect = ttRect;
    h.current.ttDate = ttDate;
    h.current.ttVal = ttVal;
    h.current.ttInOut = ttInOut;
    h.current.ttDiff = ttDiff;
    h.current.hit = hit;

    curBars.current = geom.bars;
    curRawPts.current = geom.rawPts;
    curSamples.current = geom.samples;
    isBuilt.current = true;
    resetHeader();

    return () => {
      hit.removeEventListener("mousemove", onMouseMove as EventListener);
      hit.removeEventListener("mouseleave", onMouseLeave as EventListener);

      if (rafMorphRef.current) cancelAnimationFrame(rafMorphRef.current);
      if (rafSpringRef.current) cancelAnimationFrame(rafSpringRef.current);
    };
  }, [defaultRange, onMouseLeave, onMouseMove, ranges, rebuildAxes, resetHeader]);

  useEffect(() => {
    if (!isBuilt.current) return;
    if (curRangeKey.current === activeRange) return;

    curRangeKey.current = activeRange;
    morphTo(ranges[activeRange] ?? []);
  }, [activeRange, morphTo, ranges]);

  const isUp = displayDiff >= 0;

  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#0B5FFF]" />
            Inflow
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#D92D20]" />
            Outflow
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#0E9384]" />
            Net
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span
            className="text-lg font-semibold tabular-nums transition-colors duration-300"
            style={{ color: isUp ? "#0E9384" : "#D92D20" }}
          >
            {fmtMoney(displayNet)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {isUp ? "+" : ""}
            {fmtMoney(displayDiff)}
            {isHovering ? " range" : " period"}
          </span>
        </div>
      </div>

      <div className="relative h-[260px] w-full overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full"
        />
      </div>
    </SectionCard>
  );
};

export default AnimatedSplitBarsChart;
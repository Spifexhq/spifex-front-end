import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import SectionCard from "./SectionCard";
import type { TrendRange } from "../helpers";

const W = 700;
const H = 220;
const PL = 64;
const PR = 18;
const PT = 14;
const PB = 34;
const CW = W - PL - PR;
const CH = H - PT - PB;
const NS = "http://www.w3.org/2000/svg";
const SAMPLES = 120;

function svgEl(tag: string, attrs: Record<string, string> = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function scaleX(i: number, n: number) {
  return PL + CW * (i / Math.max(n - 1, 1));
}

function scaleY(v: number, mn: number, mx: number) {
  if (mx === mn) return PT + CH / 2;
  return PT + CH * (1 - (v - mn) / (mx - mn));
}

function splineAt(pts: [number, number][], t: number, axis: 0 | 1): number {
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
  const mnBase = Math.min(...data, 0);
  const mxBase = Math.max(...data, 0);
  const pad = Math.max((mxBase - mnBase) * 0.12, 1);
  const mn = mnBase - pad;
  const mx = mxBase + pad;
  const rawPts: [number, number][] = data.map((v, i) => [scaleX(i, data.length), scaleY(v, mn, mx)]);
  const samples: [number, number][] = Array.from({ length: SAMPLES }, (_, s) => {
    const t = s / (SAMPLES - 1);
    return [splineAt(rawPts, t, 0), splineAt(rawPts, t, 1)];
  });
  return { samples, rawPts, mn, mx };
}

function samplesToPath(samples: [number, number][]) {
  return samples.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
}

function lerpSamples(a: [number, number][], b: [number, number][], t: number): [number, number][] {
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
}

function getTickIndexes(total: number) {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i);
  const target = total <= 12 ? 6 : 8;
  const out = new Set<number>([0, total - 1]);
  for (let i = 1; i < target - 1; i += 1) {
    out.add(Math.round(((total - 1) * i) / (target - 1)));
  }
  return Array.from(out).sort((a, b) => a - b);
}

type Props = {
  title: string;
  subtitle?: string;
  ranges: Record<string, TrendRange>;
  defaultRange?: string;
  currentValue: number;
  currentDiff: number;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
};

const AnimatedTrendChart: React.FC<Props> = ({
  title,
  subtitle,
  ranges,
  defaultRange,
  currentValue,
  currentDiff,
  footerLeft,
  footerRight,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafMorphRef = useRef<number | null>(null);
  const rafSpringRef = useRef<number | null>(null);
  const [activeRange, setActiveRange] = useState(defaultRange ?? Object.keys(ranges)[0]);
  const [displayValue, setDisplayValue] = useState(currentValue);
  const [displayDiff, setDisplayDiff] = useState(currentDiff);
  const [isHovering, setIsHovering] = useState(false);

  const spring = useRef({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, alpha: 0, targetAlpha: 0 });
  const curSamples = useRef<[number, number][]>([]);
  const curRawPts = useRef<[number, number][]>([]);
  const curData = useRef<number[]>([]);
  const curLabels = useRef<string[]>([]);
  const currentScale = useRef({ mn: 0, mx: 1 });

  const h = useRef({
    dotG: null as SVGElement | null,
    vline: null as SVGElement | null,
    ttG: null as SVGElement | null,
    ttRect: null as SVGElement | null,
    ttDate: null as SVGElement | null,
    ttVal: null as SVGElement | null,
    ttDir: null as SVGElement | null,
    linePath: null as SVGElement | null,
    fillPath: null as SVGElement | null,
    gradStop0: null as SVGElement | null,
  });

  const tabs = useMemo(() => Object.keys(ranges), [ranges]);

  const rebuildAxes = useCallback((svg: SVGSVGElement, labels: string[], mn: number, mx: number) => {
    svg.querySelectorAll("[data-axis='y'], [data-axis='x']").forEach((el) => el.remove());
    const yValues = [mx, mn + (mx - mn) / 2, mn];
    yValues.forEach((v) => {
      const y = scaleY(v, mn, mx);
      const line = svgEl("line", {
        x1: String(PL),
        y1: String(y),
        x2: String(W - PR),
        y2: String(y),
        stroke: "rgba(17,24,39,0.06)",
        "stroke-width": "1",
        "data-axis": "y",
      });
      const text = svgEl("text", {
        x: String(PL - 8),
        y: String(y + 4),
        "text-anchor": "end",
        "font-size": "10",
        fill: "rgba(17,24,39,0.45)",
        "font-family": "system-ui",
        "data-axis": "y",
      });
      text.textContent = formatCurrency(v);
      svg.append(line, text);
    });

    getTickIndexes(labels.length).forEach((i) => {
      const text = svgEl("text", {
        x: String(scaleX(i, labels.length)),
        y: String(H - 6),
        "text-anchor": "middle",
        "font-size": "10",
        fill: "rgba(17,24,39,0.45)",
        "font-family": "system-ui",
        "data-axis": "x",
      });
      text.textContent = labels[i];
      svg.append(text);
    });
  }, []);

  const resetHeader = useCallback(() => {
    const data = curData.current;
    if (!data.length) return;
    const last = data[data.length - 1];
    setDisplayValue(last);
    setDisplayDiff(last - data[0]);
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

  const morphTo = useCallback(
    (newData: number[], newLabels: string[]) => {
      const svg = svgRef.current;
      if (!svg || !curSamples.current.length) return;

      const fromSamples = [...curSamples.current];
      const { samples: toSamples, rawPts, mn, mx } = buildSamples(newData);
      currentScale.current = { mn, mx };
      rebuildAxes(svg, newLabels, mn, mx);

      const isUp = newData[newData.length - 1] >= newData[0];
      const lc = isUp ? "#0B5FFF" : "#D92D20";
      const dur = 480;
      const t0 = performance.now();

      h.current.linePath?.setAttribute("stroke", lc);
      h.current.gradStop0?.setAttribute("stop-color", lc);
      const circles = h.current.dotG?.querySelectorAll("circle");
      if (circles) {
        circles[0].setAttribute("fill", lc);
        circles[2].setAttribute("fill", lc);
        circles[1].setAttribute("stroke", lc);
      }

      if (rafMorphRef.current) cancelAnimationFrame(rafMorphRef.current);

      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
        const interp = lerpSamples(fromSamples, toSamples, e);
        const lineD = samplesToPath(interp);
        const fillD = lineD + ` L${interp[interp.length - 1][0]} ${H - PB} L${interp[0][0]} ${H - PB} Z`;
        h.current.linePath?.setAttribute("d", lineD);
        h.current.fillPath?.setAttribute("d", fillD);

        if (p < 1) {
          rafMorphRef.current = requestAnimationFrame(step);
        } else {
          curSamples.current = toSamples;
          curRawPts.current = rawPts;
          curData.current = newData;
          curLabels.current = newLabels;
          resetHeader();
        }
      };
      rafMorphRef.current = requestAnimationFrame(step);

      spring.current.targetAlpha = 0;
      startSpring();
    },
    [rebuildAxes, resetHeader, startSpring]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const initial = ranges[activeRange] ?? Object.values(ranges)[0];
    if (!initial || !initial.data.length) return;

    svg.innerHTML = "";
    curData.current = initial.data;
    curLabels.current = initial.labels;

    const { samples, rawPts, mn, mx } = buildSamples(initial.data);
    currentScale.current = { mn, mx };
    curSamples.current = samples;
    curRawPts.current = rawPts;

    const isUp = initial.data[initial.data.length - 1] >= initial.data[0];
    const lc = isUp ? "#0B5FFF" : "#D92D20";

    const defs = svgEl("defs");
    const grad = svgEl("linearGradient", { id: "reportsTrendGradient", x1: "0", y1: "0", x2: "0", y2: "1" });
    const stop0 = svgEl("stop", { offset: "0%", "stop-color": lc, "stop-opacity": "0.18" });
    const stop1 = svgEl("stop", { offset: "100%", "stop-color": lc, "stop-opacity": "0" });
    grad.append(stop0, stop1);
    defs.append(grad);
    svg.append(defs);
    h.current.gradStop0 = stop0;

    rebuildAxes(svg, initial.labels, mn, mx);

    const lineD = samplesToPath(samples);
    const fillD = lineD + ` L${samples[samples.length - 1][0]} ${H - PB} L${samples[0][0]} ${H - PB} Z`;
    const fillPath = svgEl("path", { d: fillD, fill: "url(#reportsTrendGradient)" });
    const linePath = svgEl("path", {
      d: lineD,
      fill: "none",
      stroke: lc,
      "stroke-width": "2.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    svg.append(fillPath, linePath);
    h.current.fillPath = fillPath;
    h.current.linePath = linePath;

    const vline = svgEl("line", {
      x1: "0",
      y1: String(PT),
      x2: "0",
      y2: String(H - PB),
      stroke: "rgba(17,24,39,0.12)",
      "stroke-width": "1",
      "stroke-dasharray": "3 3",
      opacity: "0",
    });
    svg.append(vline);
    h.current.vline = vline;

    const dotG = svgEl("g", { opacity: "0" });
    dotG.append(
      svgEl("circle", { r: "8", fill: lc, opacity: "0.18" }),
      svgEl("circle", { r: "5", fill: "white", stroke: lc, "stroke-width": "2" }),
      svgEl("circle", { r: "2.5", fill: lc })
    );
    svg.append(dotG);
    h.current.dotG = dotG;

    const ttG = svgEl("g", { opacity: "0" });
    const ttRect = svgEl("rect", { rx: "6", fill: "#fff", stroke: "rgba(17,24,39,0.08)", "stroke-width": "0.5" });
    const ttDate = svgEl("text", { "font-size": "10", fill: "rgba(17,24,39,0.45)", "font-family": "system-ui" });
    const ttVal = svgEl("text", { "font-size": "14", "font-weight": "600", fill: "#111827", "font-family": "system-ui" });
    const ttDir = svgEl("text", { "font-size": "10", "font-weight": "500", fill: lc, "font-family": "system-ui", "text-anchor": "end" });
    ttG.append(ttRect, ttDate, ttVal, ttDir);
    svg.append(ttG);
    Object.assign(h.current, { ttG, ttRect, ttDate, ttVal, ttDir });

    const hit = svgEl("rect", { x: String(PL), y: "0", width: String(CW), height: String(H), fill: "transparent", style: "cursor:crosshair" });
    svg.append(hit);

    const onMove = (evt: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const raw = Math.max(0, Math.min(1, ((evt.clientX - rect.left) * (W / rect.width) - PL) / CW));
      const idx = Math.max(0, Math.min(curData.current.length - 1, Math.round(raw * Math.max(curData.current.length - 1, 1))));

      spring.current.tx = splineAt(curRawPts.current, raw, 0);
      spring.current.ty = splineAt(curRawPts.current, raw, 1);
      spring.current.targetAlpha = 1;

      const value = curData.current[idx];
      const diff = value - curData.current[0];
      h.current.ttDate!.textContent = curLabels.current[idx];
      h.current.ttVal!.textContent = formatCurrency(value);
      h.current.ttDir!.textContent = `${diff >= 0 ? "+" : ""}${formatCurrency(diff)}`;
      h.current.ttDir!.setAttribute("fill", diff >= 0 ? "#0B5FFF" : "#D92D20");
      const ttW = 114;
      const ttH = 46;
      h.current.ttDate?.setAttribute("x", "6");
      h.current.ttDate?.setAttribute("y", "14");
      h.current.ttVal?.setAttribute("x", "6");
      h.current.ttVal?.setAttribute("y", "31");
      h.current.ttDir?.setAttribute("x", String(ttW - 6));
      h.current.ttDir?.setAttribute("y", "31");
      h.current.ttRect?.setAttribute("width", String(ttW));
      h.current.ttRect?.setAttribute("height", String(ttH));
      let ttx = spring.current.tx + 12;
      let tty = spring.current.ty - ttH - 8;
      if (ttx + ttW > W - PR) ttx = spring.current.tx - ttW - 12;
      if (tty < 0) tty = spring.current.ty + 12;
      h.current.ttG?.setAttribute("transform", `translate(${ttx},${tty})`);

      setDisplayValue(value);
      setDisplayDiff(diff);
      setIsHovering(true);
      startSpring();
    };

    const onLeave = () => {
      spring.current.targetAlpha = 0;
      startSpring();
      resetHeader();
    };

    hit.addEventListener("mousemove", onMove as EventListener);
    hit.addEventListener("mouseleave", onLeave as EventListener);

    spring.current.x = rawPts[rawPts.length - 1][0];
    spring.current.y = rawPts[rawPts.length - 1][1];
    spring.current.alpha = 0;
    spring.current.targetAlpha = 0;
    resetHeader();

    return () => {
      hit.removeEventListener("mousemove", onMove as EventListener);
      hit.removeEventListener("mouseleave", onLeave as EventListener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = ranges[activeRange];
    if (next?.data?.length) morphTo(next.data, next.labels);
  }, [activeRange, ranges, morphTo]);

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
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={`text-2xl font-semibold tabular-nums ${displayDiff >= 0 ? "text-[#0B5FFF]" : "text-[#D92D20]"}`}>
            {formatCurrency(displayValue)}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {displayDiff >= 0 ? "+" : ""}{formatCurrency(displayDiff)} {isHovering ? "range" : "period"}
          </div>
        </div>
        <div className="flex gap-4 text-[11px] text-gray-500">
          {footerLeft ? <div>{footerLeft}</div> : null}
          {footerRight ? <div>{footerRight}</div> : null}
        </div>
      </div>
      <div className="relative h-[220px] w-full overflow-hidden">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="block h-full w-full" />
      </div>
    </SectionCard>
  );
};

export default AnimatedTrendChart;

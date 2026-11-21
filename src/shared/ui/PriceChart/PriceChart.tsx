import { useId, useMemo, useState, type CSSProperties, type PointerEvent } from "react";
import classNames from "classnames";
import { Area, AreaChart, ReferenceDot, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import AnimatedNumber from "@/shared/ui/AnimatedNumber";
import { buildModel, compactNumber, hasVolume, padDomain, volumePath } from "./geometry";
import type { PriceChartProps, PriceChartTone, PricePoint } from "./types";

type ToneTokens = {
  surface: string;
  text: string;
  muted: string;
  border: string;
  pillActive: string;
  pillActiveText: string;
  pillText: string;
  pillHover: string;
  afterHours: string;
  volume: string;
};

/**
 * Dark values were measured on the live X cashtag widget. Light values follow
 * the X light theme tokens and are mapped onto Spifex white surfaces.
 */
const TONES: Record<PriceChartTone, ToneTokens> = {
  light: {
    surface: "#FFFFFF",
    text: "#0F1419",
    muted: "#536471",
    border: "#EFF3F4",
    pillActive: "#EFF3F4",
    pillActiveText: "#0F1419",
    pillText: "#536471",
    pillHover: "rgba(15, 20, 25, 0.05)",
    afterHours: "#8B98A5",
    volume: "#CFD9DE",
  },
  dark: {
    surface: "#000000",
    text: "#E7E9EA",
    muted: "#71767B",
    border: "#2F3336",
    pillActive: "#2A2D30",
    pillActiveText: "#E7E9EA",
    pillText: "#71767B",
    pillHover: "rgba(231, 233, 234, 0.1)",
    afterHours: "#595D62",
    volume: "#595D62",
  },
};

const ARROW_PATH =
  "M11.333 4H5.62c-.37 0-.667.298-.667.667 0 .368.298.666.667.666h4.104L3.53 11.53c-.26.26-.26.682 0 .942.13.13.3.196.471.196.171 0 .341-.066.471-.196l6.196-6.195v4.105c0 .369.298.666.666.666.37 0 .667-.297.667-.666V4.667c0-.369-.298-.667-.667-.667z";

const defaultValueFormatter = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const defaultDateFormatter = (value: PricePoint["t"]) =>
  value instanceof Date ? value.toLocaleString() : String(value);

/**
 * Price/trend chart reproducing the X cashtag widget: full-bleed plot, muted
 * volume strip, range pills, and a header that follows the hovered sample
 * without a tooltip box.
 */
export default function PriceChart({
  ranges,
  range,
  onRangeChange,
  reference,
  title,
  titleAside,
  meta,
  icon,
  lines,
  tabs,
  tab,
  onTabChange,
  tabsLabel,
  tone = "light",
  height = 151,
  showVolume = true,
  surface = true,
  animateNumbers = true,
  valueFormatter = defaultValueFormatter,
  volumeFormatter = compactNumber,
  dateFormatter = defaultDateFormatter,
  detailFormatter,
  labels,
  upColor = "#00BA7C",
  downColor = "#F4212E",
  className,
  style,
  ariaLabel,
}: PriceChartProps) {
  const gradientId = `price-chart-${useId().replace(/:/g, "")}`;
  const reduced = useReducedMotion() ?? false;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const active = ranges.find((item) => item.key === range) ?? ranges[0];
  const model = useMemo(() => buildModel(active), [active]);

  const rows = useMemo(() => {
    if (!lines?.length) return model.rows;
    return model.rows.map((row, index) => {
      const extra: Record<string, number | null> = {};
      for (const line of lines) {
        const value = line.values[index];
        extra[`line_${line.key}`] =
          typeof value === "number" && Number.isFinite(value) ? value : null;
      }
      return { ...row, ...extra };
    });
  }, [lines, model.rows]);

  // Overlay series share the axis, so the domain must cover all of them.
  const [domainLo, domainHi] = useMemo(() => {
    let lo = model.lo;
    let hi = model.hi;
    for (const line of lines ?? []) {
      for (const value of line.values) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        if (value < lo) lo = value;
        if (value > hi) hi = value;
      }
    }
    return padDomain(lo, hi);
  }, [lines, model.lo, model.hi]);

  const tokens = TONES[tone];
  const copy = {
    afterHours: labels?.afterHours ?? "After hours",
    volume: labels?.volume ?? "Volume",
    empty: labels?.empty ?? "No chart data to display",
  };

  const hasData = model.rows.length > 0;
  const hasVolumes = showVolume && hasVolume(model.rows);
  const points = active?.points ?? [];

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const shownPoint = hoveredPoint ?? model.last;

  const base = active?.reference ?? reference ?? model.first?.value ?? 0;
  // Without a series the quote still exists, so the header shows the reference
  // value with a zero delta, matching the reference widget.
  const shownValue = shownPoint?.value ?? base;
  const rawDiff = hasData ? shownValue - base : 0;
  const pct = hasData ? (base !== 0 ? (rawDiff / Math.abs(base)) * 100 : null) : 0;
  const movingUp = rawDiff >= 0;
  const deltaColor = movingUp ? upColor : downColor;

  const seriesUp = (model.last?.value ?? 0) >= (model.first?.value ?? 0);
  const seriesColor = seriesUp ? upColor : downColor;

  // The resting dot only exists when the range splits into an after-hours
  // session, matching the reference widget.
  const dotIndex = hoverIndex ?? (model.splitIndex !== null ? model.lastIndex : null);
  const dotRow = dotIndex !== null ? model.rows[dotIndex] : undefined;
  const dotValue = dotRow ? dotRow.afterHours ?? dotRow.regular : null;
  const dotColor = hoverIndex !== null ? seriesColor : tokens.afterHours;

  const thirdLine = (() => {
    if (hoveredPoint) {
      if (detailFormatter && hoverIndex !== null) return detailFormatter(hoverIndex);
      const parts = [dateFormatter(hoveredPoint.t)];
      if (typeof hoveredPoint.volume === "number" && Number.isFinite(hoveredPoint.volume)) {
        parts.push(`${copy.volume} ${volumeFormatter(hoveredPoint.volume)}`);
      }
      return parts.join(" · ");
    }
    if (model.afterHours) {
      const delta = model.afterHours.pct;
      const sign = delta >= 0 ? "+" : "-";
      return `${copy.afterHours} ${valueFormatter(model.afterHours.value)} (${sign}${Math.abs(delta).toFixed(2)}%)`;
    }
    return model.last ? dateFormatter(model.last.t) : "";
  })();

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasData) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (model.rows.length - 1));
    setHoverIndex(Math.min(model.rows.length - 1, Math.max(0, index)));
  };

  const pills = tabs && tabs.length ? tabs : ranges.map((item) => ({ key: item.key, label: item.label }));
  const activePill = tabs && tabs.length ? tab ?? tabs[0].key : range;

  const themeVars = {
    "--pc-surface": tokens.surface,
    "--pc-text": tokens.text,
    "--pc-muted": tokens.muted,
    "--pc-border": tokens.border,
    "--pc-pill-active": tokens.pillActive,
    "--pc-pill-active-fg": tokens.pillActiveText,
    "--pc-pill-fg": tokens.pillText,
    "--pc-pill-hover": tokens.pillHover,
    ...style,
  } as CSSProperties;

  return (
    <div
      className={classNames(
        "relative overflow-hidden",
        surface && "border border-[color:var(--pc-border)] bg-[var(--pc-surface)]",
        className
      )}
      style={themeVars}
    >
      <div className="px-6 pt-3">
        {title || meta || icon ? (
          <div className="flex items-center gap-2">
            {icon ? <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">{icon}</div> : null}
            <div className="min-w-0">
              {title ? (
                <div className="flex min-w-0 items-center gap-1">
                  <div className="truncate text-[15px] font-bold leading-5 text-[color:var(--pc-text)]">
                    {title}
                  </div>
                  {titleAside}
                </div>
              ) : null}
              {meta ? (
                <div className="mt-0.5 truncate text-[13px] leading-4 text-[color:var(--pc-muted)]">{meta}</div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-1 flex flex-col gap-0.5">
          <div className="text-[26px] font-extrabold leading-5 tabular-nums text-[color:var(--pc-text)]">
            {animateNumbers ? (
              <AnimatedNumber value={shownValue} format={valueFormatter} duration={0.2} />
            ) : (
              valueFormatter(shownValue)
            )}
          </div>

          <div
            className="flex items-center gap-0.5 text-[14px] font-bold leading-4"
            style={{ color: deltaColor }}
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="-ml-1 h-[18px] w-[18px] shrink-0"
              fill="currentColor"
            >
              <path d={ARROW_PATH} transform={movingUp ? undefined : "rotate(90 8 8)"} />
            </svg>
            <span className="tabular-nums">
              {animateNumbers ? (
                <AnimatedNumber value={Math.abs(rawDiff)} format={valueFormatter} duration={0.2} />
              ) : (
                valueFormatter(Math.abs(rawDiff))
              )}
            </span>
            {pct !== null ? (
              <span className="tabular-nums">
                {animateNumbers ? (
                  <AnimatedNumber
                    value={pct}
                    duration={0.2}
                    format={(next) => `(${next >= 0 ? "+" : "-"}${Math.abs(next).toFixed(2)}%)`}
                  />
                ) : (
                  `(${pct >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(2)}%)`
                )}
              </span>
            ) : null}
          </div>

          <div className="truncate text-[13px] leading-4 text-[color:var(--pc-muted)]">{thirdLine}</div>
        </div>
      </div>

      <div className="relative mt-1" style={{ height }}>
        {hasData ? (
          <>
            <div role="img" aria-label={ariaLabel} className="h-full w-full [&_.recharts-surface]:overflow-visible">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  key={active?.key}
                  data={rows}
                  margin={{ top: 4, right: model.splitIndex !== null ? 6 : 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={seriesColor} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={seriesColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <XAxis dataKey="i" hide />
                  <YAxis hide domain={[domainLo, domainHi]} />

                  <Area
                    type="monotone"
                    dataKey="regular"
                    stroke={seriesColor}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    fillOpacity={1}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={!reduced}
                    animationBegin={0}
                    animationDuration={300}
                    animationEasing="ease-out"
                  />

                  {model.splitIndex !== null ? (
                    <Area
                      type="monotone"
                      dataKey="afterHours"
                      stroke={tokens.afterHours}
                      strokeWidth={2}
                      fill="none"
                      fillOpacity={0}
                      opacity={0.6}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={!reduced}
                      animationBegin={0}
                      animationDuration={300}
                      animationEasing="ease-out"
                    />
                  ) : null}

                  {lines?.map((line) => (
                    <Area
                      key={line.key}
                      type="monotone"
                      dataKey={`line_${line.key}`}
                      stroke={line.color}
                      strokeWidth={2}
                      fill="none"
                      fillOpacity={0}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={!reduced}
                      animationBegin={0}
                      animationDuration={300}
                      animationEasing="ease-out"
                    />
                  ))}

                  {dotValue !== null ? (
                    <ReferenceDot
                      x={dotRow?.i}
                      y={dotValue}
                      r={4}
                      fill={dotColor}
                      fillOpacity={1}
                      stroke={dotColor}
                      strokeWidth={1}
                    />
                  ) : null}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div
              className="absolute inset-0 cursor-crosshair [touch-action:pan-y]"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHoverIndex(null)}
              onPointerCancel={() => setHoverIndex(null)}
              aria-hidden="true"
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-center text-[13px] leading-4 text-[color:var(--pc-muted)]">{copy.empty}</p>
          </div>
        )}
      </div>

      {hasVolumes ? (
        <motion.svg
          key={active?.key}
          viewBox="0 0 1000 35"
          preserveAspectRatio="none"
          width="100%"
          height={35}
          aria-hidden="true"
          className="block"
          style={{ transformOrigin: "bottom" }}
          initial={reduced ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: "easeOut" }}
        >
          <path d={volumePath(model.rows)} fill={tokens.volume} />
        </motion.svg>
      ) : null}

      <div className="mt-3 flex gap-[3px] px-6 pb-3" role="group" aria-label={tabsLabel}>
        {pills.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={item.key === activePill}
            onClick={() => (tabs && tabs.length ? onTabChange?.(item.key) : onRangeChange?.(item.key))}
            className="h-8 min-w-0 flex-1 rounded-full px-2 text-[13px] leading-none text-[color:var(--pc-pill-fg)] transition-colors hover:bg-[var(--pc-pill-hover)] aria-pressed:bg-[var(--pc-pill-active)] aria-pressed:text-[color:var(--pc-pill-active-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transition-none"
          >
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

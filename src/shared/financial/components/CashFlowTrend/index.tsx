import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Card from "@/shared/ui/Card";
import InfoTooltip from "@/shared/ui/InfoTooltip";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import AnimatedNumber from "@/shared/ui/AnimatedNumber";
import Button from "@/shared/ui/Button";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { PeriodPoint } from "@/models/finance/overview";
import {
  cumulative,
  indexFromRatio,
  linePath,
  paddedDomain,
  resample,
  tickIndices,
  valueAt,
} from "./geometry";
import { FORECAST_RANGES, type ForecastFilters, type ForecastLoader, type RangeKey } from "./types";
import { useForecast } from "./useForecast";

type Mode = "due" | "projected";
type SeriesKey = "receivables" | "paid" | "net" | "balance";

const COLORS: Record<SeriesKey, string> = {
  receivables: "#059669",
  paid: "#B42318",
  net: "#0EA5E9",
  balance: "#4F46E5",
};
const GHOST = "#CBD5E1";

const HEIGHT = 260;
/** Horizontal breathing room so edge labels never touch the card border. */
const PAD = 18;
const MORPH_SPRING = { type: "spring", stiffness: 95, damping: 24, mass: 1 } as const;
const HOVER_SPRING = { type: "spring", stiffness: 340, damping: 32, mass: 0.5 } as const;
/** Slower, softer return so the coloured line refills fluidly after leaving. */
const REFILL_SPRING = { type: "spring", stiffness: 80, damping: 20, mass: 1 } as const;

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

export type CashFlowTrendViewProps = {
  buckets: PeriodPoint[];
  /** Consolidated balance today, or `null` when the projection cannot be trusted. */
  opening: number | null;
  currency?: string | null;
  loading?: boolean;
  failed?: boolean;
  onRetry?(): void;
  rangeKey: RangeKey;
  onRangeChange(key: RangeKey): void;
  start: string;
  end: string;
};

export function CashFlowTrendView({
  buckets,
  opening,
  currency,
  loading = false,
  failed = false,
  onRetry,
  rangeKey,
  onRangeChange,
  start,
  end,
}: CashFlowTrendViewProps) {
  const { t, i18n } = useTranslation("overview");
  const [mode, setMode] = useState<Mode>("due");
  const [visible, setVisible] = useState({ receivables: true, paid: true, net: false, balance: true });
  const [hover, setHover] = useState<number | null>(null);
  const [plotRef, width] = useElementWidth<HTMLDivElement>();
  const gradientId = `cash-flow-${useId().replace(/:/g, "")}`;
  const pastClipId = `${gradientId}-past`;
  const futureClipId = `${gradientId}-future`;
  const reduced = useReducedMotion() ?? false;

  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const monthDay = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }), [locale]);
  const fullDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    [locale]
  );
  const asDate = (iso: string) => new Date(`${iso}T12:00:00`);

  const money = (value: number) => formatCurrency(value, currency || undefined);

  const projectedAvailable = opening !== null;
  const effectiveMode: Mode = mode === "projected" && projectedAvailable ? "projected" : "due";
  const dueMode = effectiveMode === "due";

  useEffect(() => setHover(null), [effectiveMode, rangeKey]);

  const inValues = useMemo(() => buckets.map((point) => Number(point.in) || 0), [buckets]);
  const outValues = useMemo(() => buckets.map((point) => Number(point.out) || 0), [buckets]);
  const netValues = useMemo(() => buckets.map((point) => Number(point.net) || 0), [buckets]);

  const cumIn = useMemo(() => cumulative(inValues), [inValues]);
  const cumOut = useMemo(() => cumulative(outValues), [outValues]);
  const cumNet = useMemo(() => cumulative(netValues), [netValues]);
  const balance = useMemo(() => cumNet.map((value) => (opening ?? 0) + value), [cumNet, opening]);

  const innerWidth = Math.max(1, width - PAD * 2);

  /** Every mode keeps the same semantics per key so paths can morph instead of swap. */
  const series = useMemo(() => {
    const rows: { key: SeriesKey; values: number[]; dashed?: boolean }[] = [];
    if (visible.receivables) rows.push({ key: "receivables", values: dueMode ? inValues : cumIn });
    if (visible.paid) rows.push({ key: "paid", values: dueMode ? outValues : cumOut });
    if (visible.net) rows.push({ key: "net", values: dueMode ? netValues : cumNet, dashed: true });
    return rows;
  }, [cumIn, cumNet, cumOut, dueMode, inValues, netValues, outValues, visible]);

  const [min, max] = useMemo(() => {
    let low = Infinity;
    let high = -Infinity;
    const rows = dueMode || !visible.balance ? series : [...series, { values: balance }];
    for (const row of rows) {
      for (const value of row.values) {
        if (value < low) low = value;
        if (value > high) high = value;
      }
    }
    if (!Number.isFinite(low) || !Number.isFinite(high)) return [0, 1] as const;
    return paddedDomain(low, high);
  }, [balance, dueMode, series, visible.balance]);

  const paths = useMemo(
    () =>
      series.map((row) => ({
        ...row,
        samples: resample(row.values),
        line: linePath(row.values, innerWidth, HEIGHT, min, max),
      })),
    [innerWidth, max, min, series]
  );

  /** The projected balance line exists only in Projected mode and can be hidden. */
  const balancePath = useMemo(
    () => (dueMode || !visible.balance ? "" : linePath(balance, innerWidth, HEIGHT, min, max)),
    [balance, dueMode, innerWidth, max, min, visible.balance]
  );

  const totalIn = inValues.reduce((sum, value) => sum + value, 0);
  const totalOut = outValues.reduce((sum, value) => sum + value, 0);
  const netDue = totalIn - totalOut;
  const closing = balance.length ? balance[balance.length - 1] : opening ?? 0;

  const hoveredBucket = hover !== null ? buckets[hover] : null;
  const ratio = hover !== null && buckets.length > 1 ? hover / (buckets.length - 1) : null;
  const hoveredX = ratio !== null ? PAD + ratio * innerWidth : 0;
  const splitX = ratio !== null ? ratio * innerWidth : innerWidth;

  const shownIn = hoveredBucket ? Number(hoveredBucket.in) || 0 : totalIn;
  const shownOut = hoveredBucket ? Number(hoveredBucket.out) || 0 : totalOut;
  const shownNet = hoveredBucket ? Number(hoveredBucket.net) || 0 : netDue;
  const shownBalance = hover !== null ? balance[hover] ?? opening ?? 0 : closing;
  const shownMovement = shownBalance - (opening ?? 0);
  const movementPct = opening ? (shownMovement / Math.abs(opening)) * 100 : null;
  const numberDuration = hover !== null ? 0.18 : 0.35;

  const markers = ratio === null
    ? []
    : [
        ...paths.map((row) => ({
          key: row.key,
          color: COLORS[row.key],
          y: HEIGHT - ((valueAt(row.samples, ratio) - min) / (max - min || 1)) * HEIGHT,
        })),
        ...(balancePath
          ? [{
              key: "balance" as const,
              color: COLORS.balance,
              y: HEIGHT - ((valueAt(resample(balance), ratio) - min) / (max - min || 1)) * HEIGHT,
            }]
          : []),
      ];

  const ticks = useMemo(() => {
    if (!buckets.length) return [];
    const widthLimit = width < 480 ? 5 : width < 760 ? 8 : 12;
    const samples = [buckets[0], buckets[Math.floor(buckets.length / 2)], buckets[buckets.length - 1]];
    const longest = Math.max(...samples.map((point) => monthDay.format(asDate(point.date)).length), 5);
    const fit = Math.floor(innerWidth / (longest * 6.2 + 14));
    const limit = Math.max(2, Math.min(widthLimit, fit));
    return tickIndices(buckets.length, limit).map((index) => ({
      index,
      label: monthDay.format(asDate(buckets[index].date)),
    }));
  }, [buckets, innerWidth, monthDay, width]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (buckets.length < 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    setHover(indexFromRatio((event.clientX - rect.left - PAD) / innerWidth, buckets.length));
  };

  const toggle = (key: keyof typeof visible) =>
    setVisible((previous) => ({ ...previous, [key]: !previous[key] }));

  const showEmpty = !loading && !failed && buckets.length === 0;

  return (
    <Card as="section" radius="xl" tone="slate" padding="none" className="min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1 text-sm font-semibold text-slate-900">
            {t("trend")}
            <InfoTooltip label={t("calculation")}>{t("trendCard.help")}</InfoTooltip>
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {dueMode ? t("trendCard.dueHint") : t("trendCard.projectedHint")}
          </p>
        </div>
        <SegmentedControl<Mode>
          value={effectiveMode}
          label={t("trendCard.modeLabel")}
          onChange={setMode}
          items={[
            { value: "due", label: t("trendCard.due") },
            { value: "projected", label: t("trendCard.projected"), disabled: !projectedAvailable },
          ]}
        />
      </div>

      <div className="px-5 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {t(dueMode ? "trendCard.dueCaption" : "trendCard.projectedCaption")}
        </p>
        <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
          <AnimatedNumber
            value={dueMode ? shownNet : shownBalance}
            format={money}
            duration={numberDuration}
          />
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={effectiveMode}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1"
            >
              {dueMode ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.receivables }} />
                    <span className="tabular-nums">
                      <AnimatedNumber value={shownIn} format={money} duration={numberDuration} />
                    </span>
                    <span className="text-slate-400">{t("trendCard.receivables").toLowerCase()}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.paid }} />
                    <span className="tabular-nums">
                      <AnimatedNumber value={shownOut} format={money} duration={numberDuration} />
                    </span>
                    <span className="text-slate-400">{t("trendCard.paid").toLowerCase()}</span>
                  </span>
                </>
              ) : (
                <span
                  className="inline-flex items-center gap-1 font-medium"
                  style={{ color: shownMovement >= 0 ? "#059669" : "#DC2626" }}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" transform={shownMovement >= 0 ? undefined : "rotate(90 8 8)"} />
                  </svg>
                  <span className="tabular-nums">
                    <AnimatedNumber value={Math.abs(shownMovement)} format={money} duration={numberDuration} />
                  </span>
                  {movementPct !== null ? (
                    <span className="tabular-nums">
                      ({movementPct >= 0 ? "+" : "-"}
                      {Math.abs(movementPct).toFixed(1)}%)
                    </span>
                  ) : null}
                  <span className="font-normal text-slate-400">{t("trendCard.vsToday")}</span>
                </span>
              )}
            </motion.div>
          </AnimatePresence>
          <span className="text-slate-400">
            {t("trendCard.window", { start: formatDateFromISO(start), end: formatDateFromISO(end) })}
          </span>
        </div>
      </div>

      <div
        ref={plotRef}
        className="relative mt-4"
        style={{ height: HEIGHT }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
        onPointerCancel={() => setHover(null)}
      >
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-xs text-slate-500">{t("trendCard.error")}</p>
            {onRetry ? <Button variant="outline" size="xs" onClick={onRetry}>{t("trendCard.retry")}</Button> : null}
          </div>
        ) : !buckets.length && loading ? (
          <div className="flex h-full items-center px-5" aria-hidden="true">
            <div className="h-full w-full animate-pulse rounded-lg bg-gradient-to-b from-slate-100 to-transparent" />
          </div>
        ) : showEmpty ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-xs text-slate-500">{t("trendCard.empty")}</p>
          </div>
        ) : (
          <>
            {width > 0 && (
              <svg width={width} height={HEIGHT} className="block overflow-visible" role="img" aria-label={t("trendCard.chartLabel")}>
                <defs>
                  <clipPath id={pastClipId}>
                    <motion.rect
                      initial={false}
                      x={0}
                      y={0}
                      height={HEIGHT}
                      width={0}
                      animate={{ width: splitX }}
                      transition={reduced ? { duration: 0 } : hover !== null ? HOVER_SPRING : REFILL_SPRING}
                    />
                  </clipPath>
                  <clipPath id={futureClipId}>
                    <motion.rect
                      initial={false}
                      y={0}
                      height={HEIGHT}
                      width={0}
                      animate={{ x: splitX, width: Math.max(0, innerWidth - splitX) }}
                      transition={reduced ? { duration: 0 } : hover !== null ? HOVER_SPRING : REFILL_SPRING}
                    />
                  </clipPath>
                </defs>

                <g transform={`translate(${PAD} 0)`}>
                  {paths.map((row) => (
                    <g key={row.key}>
                      <motion.path
                        d={row.line}
                        initial={{ d: row.line, opacity: 0 }}
                        animate={{ d: row.line, opacity: 1 }}
                        transition={reduced ? { duration: 0 } : { d: MORPH_SPRING, opacity: { duration: 0.3, ease: "easeOut" } }}
                        fill="none"
                        stroke={GHOST}
                        strokeWidth={row.dashed ? 1.8 : 2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={row.dashed ? "6 5" : undefined}
                        clipPath={`url(#${futureClipId})`}
                      />
                      <motion.path
                        d={row.line}
                        initial={{ d: row.line, opacity: 0 }}
                        animate={{ d: row.line, opacity: 1 }}
                        transition={reduced ? { duration: 0 } : { d: MORPH_SPRING, opacity: { duration: 0.3, ease: "easeOut" } }}
                        fill="none"
                        stroke={COLORS[row.key]}
                        strokeWidth={row.dashed ? 1.8 : 2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={row.dashed ? "6 5" : undefined}
                        clipPath={`url(#${pastClipId})`}
                      />
                    </g>
                  ))}

                  <AnimatePresence>
                    {balancePath ? (
                      <motion.g
                        key="balance"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={reduced ? { duration: 0 } : { opacity: { duration: 0.3, ease: "easeOut" } }}
                      >
                        <motion.path
                          d={balancePath}
                          animate={{ d: balancePath }}
                          transition={reduced ? { duration: 0 } : MORPH_SPRING}
                          fill="none"
                          stroke={GHOST}
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          clipPath={`url(#${futureClipId})`}
                        />
                        <motion.path
                          d={balancePath}
                          animate={{ d: balancePath }}
                          transition={reduced ? { duration: 0 } : MORPH_SPRING}
                          fill="none"
                          stroke={COLORS.balance}
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          clipPath={`url(#${pastClipId})`}
                        />
                      </motion.g>
                    ) : null}
                  </AnimatePresence>

                  {hover !== null ? (
                    <g pointerEvents="none">
                      <motion.line
                        initial={false}
                        y1={0}
                        y2={HEIGHT}
                        stroke="#0F172A"
                        strokeOpacity={0.14}
                        strokeWidth={1}
                        animate={{ x1: hoveredX - PAD, x2: hoveredX - PAD }}
                        transition={reduced ? { duration: 0 } : HOVER_SPRING}
                      />
                      {markers.map((marker) => (
                        <motion.circle
                          key={marker.key}
                          r={4}
                          fill="#fff"
                          stroke={marker.color}
                          strokeWidth={2}
                          initial={false}
                          animate={{ cx: hoveredX - PAD, cy: marker.y }}
                          transition={reduced ? { duration: 0 } : HOVER_SPRING}
                        />
                      ))}
                    </g>
                  ) : null}
                </g>
              </svg>
            )}

            <AnimatePresence>
              {hover !== null && hoveredBucket ? (
                <motion.div
                  key="date-pill"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ x: Math.min(Math.max(hoveredX, 82), Math.max(82, width - 82)), opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={reduced ? { duration: 0 } : HOVER_SPRING}
                  className="pointer-events-none absolute left-0 top-2 z-10"
                >
                  <div className="-translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                    {fullDate.format(asDate(hoveredBucket.date))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </div>

      {!failed && buckets.length > 0 ? (
        <div className="relative mt-2 h-4">
          {ticks.map(({ index, label }) => {
            const position = PAD + (buckets.length > 1 ? (index / (buckets.length - 1)) * innerWidth : innerWidth / 2);
            const align = index === 0 ? "translate-x-0" : index === buckets.length - 1 ? "-translate-x-full" : "-translate-x-1/2";
            return (
              <span
                key={index}
                className={`absolute top-0 whitespace-nowrap text-[10px] tabular-nums text-slate-400 ${align}`}
                style={{ left: position }}
              >
                {label}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("trendCard.seriesLabel")}>
          <SeriesChip
            label={t("trendCard.receivables")}
            color={COLORS.receivables}
            pressed={visible.receivables}
            onClick={() => toggle("receivables")}
          />
          <SeriesChip
            label={t("trendCard.paid")}
            color={COLORS.paid}
            pressed={visible.paid}
            onClick={() => toggle("paid")}
          />
          <SeriesChip
            label={t("trendCard.net")}
            color={COLORS.net}
            pressed={visible.net}
            dashed
            onClick={() => toggle("net")}
          />
          {!dueMode ? (
            <SeriesChip
              label={t("trendCard.balance")}
              color={COLORS.balance}
              pressed={visible.balance}
              onClick={() => toggle("balance")}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-1" role="group" aria-label={t("trendCard.rangeLabel")}>
          {FORECAST_RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === rangeKey}
              onClick={() => onRangeChange(item.key)}
              className="h-7 rounded-full px-2.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 aria-pressed:bg-slate-900 aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 motion-reduce:transition-none"
            >
              {t(`trendCard.ranges.${item.key}`)}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SeriesChip({ label, color, pressed, dashed, onClick }: {
  label: string;
  color: string;
  pressed: boolean;
  dashed?: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 aria-pressed:border-slate-300 aria-pressed:bg-slate-50 aria-pressed:text-slate-900 motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className="h-0.5 w-3 rounded-full"
        style={{
          backgroundColor: pressed ? (dashed ? "transparent" : color) : "#CBD5E1",
          backgroundImage: pressed && dashed ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)` : undefined,
        }}
      />
      {label}
    </button>
  );
}

export default function CashFlowTrend({ load, filters }: {
  load: ForecastLoader;
  filters?: ForecastFilters;
}) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const { data, window, loading, failed, reload } = useForecast(rangeKey, filters ?? {}, load);

  return (
    <CashFlowTrendView
      buckets={data?.buckets ?? []}
      opening={data?.opening ?? null}
      currency={data?.currency}
      loading={loading}
      failed={failed}
      onRetry={reload}
      rangeKey={rangeKey}
      onRangeChange={setRangeKey}
      start={window.start}
      end={window.end}
    />
  );
}


import type { PricePoint, PriceRange } from "./types";

export type ChartRow = {
  i: number;
  t: PricePoint["t"];
  /** Regular-session series value; `null` where the after-hours series takes over. */
  regular: number | null;
  /** After-hours series value; `null` before the split. */
  afterHours: number | null;
  volume: number | null;
};

export type ChartModel = {
  rows: ChartRow[];
  lo: number;
  hi: number;
  /** Index where the after-hours series starts, when the range is split. */
  splitIndex: number | null;
  lastIndex: number;
  last: PricePoint | null;
  lastRegular: PricePoint | null;
  first: PricePoint | null;
  /** After-hours summary for the resting header: last value and its delta vs the regular close. */
  afterHours: { value: number; pct: number } | null;
};

const EMPTY: ChartModel = {
  rows: [],
  lo: 0,
  hi: 1,
  splitIndex: null,
  lastIndex: -1,
  last: null,
  lastRegular: null,
  first: null,
  afterHours: null,
};

/**
 * Splits a range into the regular and after-hours series. Both series share the
 * split value so the two paths meet at the same point, matching the reference
 * chart instead of leaving a vertical gap.
 */
export function buildModel(range: PriceRange | undefined): ChartModel {
  const points = range?.points ?? [];
  if (!points.length) return EMPTY;

  const found = points.findIndex((point) => point.phase === "after-hours");
  const splitIndex = found > 0 ? found : null;

  const rows: ChartRow[] = points.map((point, i) => {
    const volume = typeof point.volume === "number" && Number.isFinite(point.volume) ? point.volume : null;

    if (splitIndex === null) {
      return { i, t: point.t, regular: point.value, afterHours: null, volume };
    }

    const close = points[splitIndex - 1].value;
    if (i < splitIndex) {
      return { i, t: point.t, regular: point.value, afterHours: null, volume };
    }
    if (i === splitIndex) {
      return { i, t: point.t, regular: close, afterHours: close, volume };
    }
    return { i, t: point.t, regular: null, afterHours: point.value, volume };
  });

  let min = points[0].value;
  let max = points[0].value;
  for (const point of points) {
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  }

  const last = points[points.length - 1];
  const lastRegular = splitIndex === null ? null : points[splitIndex - 1];

  return {
    rows,
    lo: min,
    hi: max,
    splitIndex,
    lastIndex: points.length - 1,
    last,
    lastRegular,
    first: points[0],
    afterHours:
      splitIndex !== null && lastRegular && lastRegular.value !== 0
        ? { value: last.value, pct: ((last.value - lastRegular.value) / Math.abs(lastRegular.value)) * 100 }
        : null,
  };
}

/** True when at least one sample carries a usable volume value. */
export function hasVolume(rows: ChartRow[]): boolean {
  return rows.some((row) => row.volume !== null);
}

/** Adds the 2 % breathing room the reference chart keeps above and below the series. */
export function padDomain(lo: number, hi: number): [number, number] {
  const span = hi - lo;
  const pad = span > 0 ? span * 0.02 : Math.max(Math.abs(hi) * 0.01, 1);
  return [lo - pad, hi + pad];
}

/**
 * Builds the volume strip as one path of bottom-aligned bars. The strip uses a
 * fixed 1000-unit viewBox stretched by the renderer, so bars keep a constant
 * pitch regardless of the container width.
 */
export function volumePath(rows: ChartRow[], height = 35, width = 1000): string {
  if (!rows.length) return "";

  let max = 0;
  for (const row of rows) {
    const value = row.volume ?? 0;
    if (value > max) max = value;
  }
  if (max <= 0) return "";

  const pitch = width / rows.length;
  const bar = pitch * 0.54;
  const parts: string[] = [];

  rows.forEach((row, index) => {
    if (row.volume === null) return;
    const barHeight = (row.volume / max) * height;
    if (barHeight <= 0) return;
    const x = index * pitch + (pitch - bar) / 2;
    const top = height - barHeight;
    parts.push(
      `M${x.toFixed(2)} ${top.toFixed(2)} H${(x + bar).toFixed(2)} V${height} H${x.toFixed(2)} Z`
    );
  });

  return parts.join(" ");
}

/** Compact magnitude used by the volume line: 2.9M, 27.1M, 1.2T. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${trimZero(abs / 1e12)}T`;
  if (abs >= 1e9) return `${sign}${trimZero(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${trimZero(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${trimZero(abs / 1e3)}K`;
  return `${sign}${Math.round(abs)}`;
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

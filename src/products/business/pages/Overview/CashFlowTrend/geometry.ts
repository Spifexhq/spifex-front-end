/** Fixed sample count so every path has identical structure and can morph. */
export const SAMPLES = 180;

/** Linear resample to a fixed length; keeps the endpoints and the overall shape. */
export function resample(values: number[], samples = SAMPLES): number[] {
  if (!values.length) return [];
  if (values.length === 1) return Array.from({ length: samples }, () => values[0]);

  const last = values.length - 1;
  const out = new Array<number>(samples);

  for (let i = 0; i < samples; i += 1) {
    const t = (i / (samples - 1)) * last;
    const low = Math.floor(t);
    const high = Math.min(low + 1, last);
    const fraction = t - low;
    out[i] = values[low] + (values[high] - values[low]) * fraction;
  }

  return out;
}

/** Fritsch–Carlson tangents: smooth without overshooting below the series. */
function tangents(ys: number[], dx: number): number[] {
  const n = ys.length;
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) slope.push((ys[i + 1] - ys[i]) / dx);

  const m = new Array<number>(n);
  m[0] = slope[0] ?? 0;
  m[n - 1] = slope[n - 2] ?? 0;

  for (let i = 1; i < n - 1; i += 1) {
    const previous = slope[i - 1];
    const next = slope[i];
    if (previous * next <= 0) {
      m[i] = 0;
      continue;
    }
    const average = (previous + next) / 2;
    const limit = 3 * Math.min(Math.abs(previous), Math.abs(next));
    m[i] = Math.sign(average) * Math.min(Math.abs(average), limit);
  }

  return m;
}

const round = (value: number) => (Math.round(value * 100) / 100).toFixed(2);

/** Monotone cubic path with a constant number of `C` segments. */
export function linePath(values: number[], width: number, height: number, min: number, max: number): string {
  const samples = resample(values);
  if (!samples.length || width <= 0 || height <= 0) return "";

  const span = max - min || 1;
  const dx = width / (samples.length - 1);
  const xs = samples.map((_, index) => index * dx);
  const ys = samples.map((value) => height - ((value - min) / span) * height);
  const m = tangents(ys, dx);

  let path = `M${round(xs[0])} ${round(ys[0])}`;
  for (let i = 0; i < samples.length - 1; i += 1) {
    path += `C${round(xs[i] + dx / 3)} ${round(ys[i] + (m[i] * dx) / 3)} ${round(xs[i + 1] - dx / 3)} ${round(ys[i + 1] - (m[i + 1] * dx) / 3)} ${round(xs[i + 1])} ${round(ys[i + 1])}`;
  }
  return path;
}

/** Area closing the line to the plot floor with the same structure every time. */
export function areaPath(line: string, width: number, height: number): string {
  if (!line) return "";
  return `${line}L${round(width)} ${round(height)}L0 ${round(height)}Z`;
}

/** Padded domain so the series never touches the plot edges. */
export function paddedDomain(min: number, max: number): [number, number] {
  const span = max - min;
  const pad = span > 0 ? span * 0.12 : Math.max(Math.abs(max) * 0.05, 1);
  return [min - pad, max + pad];
}

/** Bucket index for a pointer position inside the plot. */
export function indexFromRatio(ratio: number, length: number): number {
  if (length <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, ratio));
  return Math.min(length - 1, Math.max(0, Math.round(clamped * (length - 1))));
}

/** Value on the resampled curve, so hover markers sit exactly on the drawn line. */
export function valueAt(samples: number[], ratio: number): number {
  if (!samples.length) return 0;
  if (samples.length === 1) return samples[0];
  const t = Math.min(1, Math.max(0, ratio)) * (samples.length - 1);
  const low = Math.floor(t);
  const high = Math.min(low + 1, samples.length - 1);
  return samples[low] + (samples[high] - samples[low]) * (t - low);
}

/** Evenly spaced label positions, capped so the axis never crowds. */
export function tickIndices(length: number, max = 12): number[] {
  if (length <= 0) return [];
  if (length <= max) return Array.from({ length }, (_, index) => index);
  const step = (length - 1) / (max - 1);
  const seen = new Set<number>();
  for (let index = 0; index < max; index += 1) seen.add(Math.round(index * step));
  return Array.from(seen).sort((a, b) => a - b);
}

export function cumulative(values: number[]): number[] {
  let running = 0;
  return values.map((value) => {
    running += value;
    return running;
  });
}

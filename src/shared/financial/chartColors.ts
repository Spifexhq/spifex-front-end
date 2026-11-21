/**
 * One palette for every series drawn inside a card: money in is green, money
 * out is red, and net-style lines follow the direction of the window.
 */
export const CHART_COLORS = {
  positive: "#059669",
  negative: "#B42318",
  balance: "#4F46E5",
  neutral: "#94A3B8",
} as const;

/** Green while the series ends above where it started, red while it ends below. */
export function trendColor(values: number[] | undefined, fallback: string = CHART_COLORS.neutral): string {
  if (!values || values.length < 2) return fallback;
  const first = values[0];
  const last = values[values.length - 1];
  if (last === first) return fallback;
  return last > first ? CHART_COLORS.positive : CHART_COLORS.negative;
}

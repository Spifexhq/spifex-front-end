import type { PeriodPoint } from "@/models/finance/overview";

/** CSV export shared by the Business and Personal overviews. */
export function exportSeries(series: PeriodPoint[], headers: string[]) {
  const quote = (value: string | number) => {
    const text = String(value);
    const safe = /^[-+]?\d+(?:\.\d+)?$/.test(text) ? text : text.replace(/^[=+@-]/, "'$&");
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [headers, ...series.map(point => [point.date, point.in, point.out, point.net, point.count])].map(row => row.map(quote).join(",")).join("\r\n");
}

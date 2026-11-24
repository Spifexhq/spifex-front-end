import type { PeriodPoint } from "@/models/finance/overview";

/** CSV export shared by the Business and Personal overviews. */
export function exportSeries(series: PeriodPoint[], headers: string[], currency?: string | null) {
  const quote = (value: string | number) => {
    const text = String(value);
    const safe = /^[-+]?\d+(?:\.\d+)?$/.test(text) ? text : text.replace(/^[=+@-]/, "'$&");
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const resolvedHeaders = currency
    ? headers.map((header, index) => (index >= 1 && index <= 3 ? `${header} (${currency})` : header))
    : headers;
  return "\uFEFF" + [resolvedHeaders, ...series.map(point => [point.date, point.in, point.out, point.net, point.count])].map(row => row.map(quote).join(",")).join("\r\n");
}

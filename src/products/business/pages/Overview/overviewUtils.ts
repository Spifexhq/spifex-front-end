import type { OverviewQuery, PeriodPoint } from "@/models/finance/overview";
export function localISO(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export function periodPreset(days: number, today = new Date()) { const end = new Date(today), start = new Date(today); start.setDate(start.getDate()-days+1); return { start_date: localISO(start), end_date: localISO(end) }; }
export function queryFromParams(params: URLSearchParams): OverviewQuery {
  const fallback = periodPreset(30);
  const basis = params.get("basis") === "settled" ? "settled" : "planned";
  const group = params.get("group_by");
  return { start_date: params.get("start_date") || fallback.start_date, end_date: params.get("end_date") || fallback.end_date, basis, group_by: group === "week" || group === "month" ? group : "day", ...(basis === "settled" && params.get("bank_id") ? { bank_id: params.get("bank_id")! } : {}), cashflow_category_id: params.get("cashflow_category_id") || undefined, description: params.get("description") || undefined };
}
export function cumulativeValues(series: PeriodPoint[], field: "in" | "out" | "net" | "count") { let value = 0; return series.map(point => { value += Number(point[field]); return value; }); }
export function percentageChange(current: number, previous: number): number | null { return previous === 0 ? current === 0 ? 0 : null : (current-previous)/Math.abs(previous); }
export function exportSeries(series: PeriodPoint[], headers: string[]) {
  const quote = (value: string | number) => {
    const text = String(value);
    const safe = /^[-+]?\d+(?:\.\d+)?$/.test(text) ? text : text.replace(/^[=+@-]/, "'$&");
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [headers, ...series.map(point => [point.date, point.in, point.out, point.net, point.count])].map(row => row.map(quote).join(",")).join("\r\n");
}

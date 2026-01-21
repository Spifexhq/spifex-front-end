import { formatCurrency } from "@/lib/currency";
import type { ApiResponse, ApiError as ApiErrorResponse } from "@/models/Api";
import type { EntryFilters, LocalFilters } from "@/models/components/filterBar";

export function isApiError<T>(res: ApiResponse<T>): res is ApiErrorResponse {
  return "error" in res;
}

export function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function parseLooseNumber(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function isPositiveMajor(value?: string): boolean {
  const n = parseLooseNumber(String(value ?? ""));
  return n !== null && n > 0;
}

/**
 * Date utilities (rolling ranges forward from today):
 * - Anchor at local noon to avoid DST boundary drift.
 * - Rolling: week = +7 days, month = +1 month, quarter = +3 months, year = +12 months.
 */
export function dateAtNoonLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function toISODateLocal(d: Date): string {
  const x = dateAtNoonLocal(d);
  const yyyy = String(x.getFullYear());
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function addDaysLocal(base: Date, days: number): Date {
  const d = dateAtNoonLocal(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Month add that clamps to last valid day of target month.
 * Example: Jan 31 + 1 month => Feb 28/29.
 */
export function addMonthsLocal(base: Date, months: number): Date {
  const b = dateAtNoonLocal(base);
  const desiredDay = b.getDate();

  const targetFirst = new Date(b.getFullYear(), b.getMonth() + months, 1, 12, 0, 0, 0);
  const targetYear = targetFirst.getFullYear();
  const targetMonth = targetFirst.getMonth();

  let cand = new Date(targetYear, targetMonth, desiredDay, 12, 0, 0, 0);

  if (cand.getMonth() !== targetMonth) {
    cand = new Date(targetYear, targetMonth + 1, 0, 12, 0, 0, 0);
  }

  return cand;
}

export function addYearsLocal(base: Date, years: number): Date {
  return addMonthsLocal(base, years * 12);
}

export function amountChipLabel(minMajor?: string, maxMajor?: string, t?: (k: string) => string): string {
  const parts: string[] = [];
  if (minMajor && isPositiveMajor(minMajor)) parts.push(`≥ ${formatCurrency(minMajor)}`);
  if (maxMajor && isPositiveMajor(maxMajor)) parts.push(`≤ ${formatCurrency(maxMajor)}`);

  const prefix = t ? t("filterBar:chips.value") : "Value";
  return `${prefix} ${parts.join(" ")}`.trim();
}

export function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const maybe = data as { results?: unknown };
    if (Array.isArray(maybe.results)) return maybe.results as T[];
  }
  return [];
}

export function buildInitialLocalFilters(initial: EntryFilters | undefined, contextSettlement: boolean): LocalFilters {
  return {
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    description: initial?.description ?? "",
    observation: initial?.observation ?? "",
    ledger_account_id: normalizeStringArray(initial?.ledger_account_id),
    bank_id: normalizeStringArray(initial?.bank_id),
    tx_type: initial?.tx_type,
    amount_min: initial?.amount_min ? String(initial.amount_min) : "",
    amount_max: initial?.amount_max ? String(initial.amount_max) : "",
    settlement_status: initial?.settlement_status ?? contextSettlement,
  };
}

export function buildClearedLocalFilters(contextSettlement: boolean): LocalFilters {
  return {
    start_date: "",
    end_date: "",
    description: "",
    observation: "",
    ledger_account_id: [],
    bank_id: [],
    tx_type: undefined,
    amount_min: "",
    amount_max: "",
    settlement_status: contextSettlement,
  };
}

export function toEntryFilters(local: LocalFilters): EntryFilters {
  const min = isPositiveMajor(local.amount_min) ? String(local.amount_min) : undefined;
  const max = isPositiveMajor(local.amount_max) ? String(local.amount_max) : undefined;

  return {
    start_date: local.start_date || undefined,
    end_date: local.end_date || undefined,
    description: local.description || undefined,
    observation: local.observation || undefined,
    ledger_account_id: local.ledger_account_id.length ? local.ledger_account_id : undefined,
    bank_id: local.bank_id.length ? local.bank_id : undefined,
    tx_type: local.tx_type,
    amount_min: min,
    amount_max: max,
    settlement_status: !!local.settlement_status,
  };
}

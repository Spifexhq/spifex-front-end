/* -----------------------------------------------------------------------------
 * File: src/lib/usageEvents.ts
 * Plan usage deltas exposed by the API on successful metered writes.
 * ---------------------------------------------------------------------------*/

export const USAGE_CHANGE_EVENT = "spifex:usage-change";
export const USAGE_HEADER = "x-spifex-usage";

export type UsagePeriod = "daily" | "weekly" | "monthly" | "lifetime";
export type UsageDirection = "increase" | "decrease";

export type UsageChangeEvent = {
  code: string;
  name?: string;
  used: number;
  limit: number;
  period: UsagePeriod;
  direction: UsageDirection;
  delta: number;
  reset_at?: string;
};

const PERIODS: UsagePeriod[] = ["daily", "weekly", "monthly", "lifetime"];

function toCount(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : null;
}

function toEvent(value: unknown): UsageChangeEvent | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code.trim() : "";
  const used = toCount(record.used);
  const limit = toCount(record.limit);
  const delta = toCount(record.delta);
  const period = record.period as UsagePeriod;
  const direction = record.direction as UsageDirection;
  if (!code || used === null || limit === null || delta === null || delta <= 0) return null;
  if (!PERIODS.includes(period)) return null;
  if (direction !== "increase" && direction !== "decrease") return null;
  return {
    code,
    name: typeof record.name === "string" ? record.name : undefined,
    used,
    limit,
    period,
    direction,
    delta,
    reset_at: typeof record.reset_at === "string" ? record.reset_at : undefined,
  };
}

/** Parse the compact JSON header; malformed values degrade to an empty list. */
export function parseUsageHeader(raw: unknown): UsageChangeEvent[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.map(toEvent).filter((event): event is UsageChangeEvent => event !== null);
  } catch {
    return [];
  }
}

export function notifyUsageChange(events: UsageChangeEvent[]): void {
  if (!events.length || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UsageChangeEvent[]>(USAGE_CHANGE_EVENT, { detail: events }));
}

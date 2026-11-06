import i18next from "i18next";
/** Extract safe, useful messages from Error, DRF, Axios and envelope failures. */
export function apiErrorMessage(cause: unknown, fallback: string): string {
  const quota = quotaErrorMessage(cause);
  if (quota) return quota;
  const seen = new Set<object>();
  const messages: string[] = [];
  const ignored = new Set(["code", "status", "status_code", "request_id", "phase", "steps", "account_id", "account_code", "traceback", "stack", "config", "headers"]);
  function collect(value: unknown, depth = 0) {
    if (depth > 6 || messages.length >= 12) return;
    if (typeof value === "string") {
      const text = value.trim();
      if (text && !/^\s*<(?:!doctype|html)/i.test(text) && !["[object Object]", "undefined", "null"].includes(text)) messages.push(text);
    } else if (value && typeof value === "object" && !seen.has(value)) {
      seen.add(value);
      if (Array.isArray(value)) value.forEach(item => collect(item, depth + 1));
      else Object.entries(value).forEach(([key, item]) => { if (!ignored.has(key)) collect(item, depth + 1); });
    }
  }
  if (cause && typeof cause === "object") {
    const error = cause as { response?: { data?: unknown }; error?: unknown; fields?: unknown; detail?: unknown; details?: unknown; message?: unknown };
    collect(error.response?.data ?? error.error ?? error.fields ?? error.detail ?? error.details);
    if (!messages.length) collect(error.message);
  } else collect(cause);
  return [...new Set(messages)].join(" · ").slice(0, 1200) || fallback;
}

/** Preserve API codes/fields while supporting existing instanceof Error callers. */
export function normalizeApiError(cause: unknown, fallback: string): Error {
  const message = apiErrorMessage(cause, fallback);
  const error = new Error(message);
  Object.defineProperty(error, "cause", { value: cause, configurable: true });
  if (cause && typeof cause === "object") {
    const source = cause as Record<string, unknown>;
    for (const key of ["code", "status", "request_id", "fields", "detail", "details"]) if (source[key] !== undefined) Object.assign(error, { [key]: source[key] });
  }
  return error;
}

export function isPreconditionFailure(error: unknown): boolean {
  return !!error && typeof error === "object" && [412, 428].includes((error as { status?: number }).status || 0);
}

export type QuotaIssue = { code: "quota_exceeded" | "permission_not_in_plan"; limit?: number; remaining?: number; resetAt?: string };

/** Inspect known error containers, never arbitrary user text or numeric metadata. */
export function getQuotaIssue(cause: unknown): QuotaIssue | null {
  const seen = new Set<object>();
  const inspect = (value: unknown, depth: number): QuotaIssue | null => {
    if (depth > 8) return null;
    if (typeof value === "string") {
      if (value === "quota_exceeded" || value === "permission_not_in_plan") return { code: value };
      return null;
    }
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);
    const record = value as Record<string, unknown>;
    for (const key of ["code", "reason", "detail", "error", "fields", "details", "data", "response", "cause"]) {
      const found = inspect(record[key], depth + 1);
      if (found) {
        const result = { ...found };
        for (const container of [record.detail, record.details, record.fields, record]) {
          if (!container || typeof container !== "object") continue;
          const metadata = container as Record<string, unknown>;
          if (typeof metadata.limit === "number") result.limit = metadata.limit;
          if (typeof metadata.remaining === "number") result.remaining = metadata.remaining;
          if (typeof metadata.reset_at === "string") result.resetAt = metadata.reset_at;
        }
        return result;
      }
    }
    return null;
  };
  return inspect(cause, 0);
}

export function quotaErrorMessage(cause: unknown): string | null {
  const issue = getQuotaIssue(cause);
  if (!issue) return null;
  const translate = (key: string, fallback: string, values: Record<string, unknown> = {}) => String(i18next?.t?.(`common:quota.${key}`, { defaultValue: fallback, ...values }) || fallback);
  if (issue.code === "permission_not_in_plan") return translate("notIncluded", "This action is not included in your organization's plan. Ask the owner to review the plan.");
  let message = translate("exceeded", "Your organization has reached the usage limit for this action. Review usage or ask the owner to review the plan.");
  if (issue.limit != null && Number.isFinite(issue.limit) && issue.limit >= 0) message += " " + translate("limit", `Plan limit: ${issue.limit}.`, { limit: issue.limit });
  const reset = issue.resetAt ? new Date(issue.resetAt) : null;
  if (reset && Number.isFinite(reset.getTime()) && reset.getTime() > Date.now() && reset.getUTCFullYear() < 2100) {
    const date = reset.toLocaleString(i18next?.resolvedLanguage || i18next?.language || "en");
    message += " " + translate("resets", `Resets on ${date}.`, { date });
  }
  return message;
}

export const QUOTA_WARNING_EVENT = "spifex:quota-warning";
let lastQuotaKey = "", lastQuotaAt = 0;
export function notifyQuotaError(cause: unknown): void {
  const issue = getQuotaIssue(cause);
  if (!issue || typeof window === "undefined") return;
  const key = JSON.stringify(issue), now = Date.now();
  if (lastQuotaKey === key && now - lastQuotaAt < 1500) return;
  lastQuotaKey = key; lastQuotaAt = now;
  window.dispatchEvent(new CustomEvent(QUOTA_WARNING_EVENT, { detail: issue }));
}

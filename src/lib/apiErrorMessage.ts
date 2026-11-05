/** Extract safe, useful messages from Error, DRF, Axios and envelope failures. */
export function apiErrorMessage(cause: unknown, fallback: string): string {
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

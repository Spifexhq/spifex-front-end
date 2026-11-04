/** The HTTP client throws both Error instances and structured API error bodies. */
export function accountingErrorMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error) return cause.message || fallback;
  if (!cause || typeof cause !== "object") return fallback;
  const error = cause as { fields?: unknown; detail?: unknown; message?: unknown };
  const messages: string[] = [];
  function collect(value: unknown) {
    if (typeof value === "string") messages.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, value]) => {
      if (!["code", "phase", "steps", "account_id", "account_code"].includes(key)) collect(value);
    });
  }
  collect(error.fields ?? error.detail);
  return [...new Set(messages)].join(" · ") || (typeof error.message === "string" ? error.message : fallback);
}

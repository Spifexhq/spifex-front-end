/** Resolve the display name used by the supported settings record models. */
export function recordName(input: object): string {
  const record = input as Record<string, unknown>;
  for (const key of ["full_name", "name", "institution", "title"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "—";
}

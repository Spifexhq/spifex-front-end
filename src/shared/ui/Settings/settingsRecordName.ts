/** Resolve the display name used by the supported settings record models. */
export function settingsRecordName(record: Record<string, unknown>): string {
  for (const key of ["full_name", "name", "institution", "title"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "—";
}

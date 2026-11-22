export type ExportFormat = "csv" | "xlsx";

export type ExportRange = {
  start?: string;
  end?: string;
};

export type ExportQueryBuilder = (range: ExportRange) => Record<string, unknown>;

export function buildExportFilename({
  personal,
  settled,
  format,
  start,
  end,
}: {
  personal: boolean;
  settled: boolean;
  format: ExportFormat;
  start?: string;
  end?: string;
}): string {
  const label = personal
    ? settled
      ? "personal-settled-entries"
      : "personal-cash-flow"
    : settled
      ? "settled-entries"
      : "cash-flow";
  const range = start || end ? `${start || "start"}-to-${end || "end"}` : "all-dates";
  return `spifex-${label}-${range}.${format}`;
}

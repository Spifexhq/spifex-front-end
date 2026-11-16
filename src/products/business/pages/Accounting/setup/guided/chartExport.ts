import type { AiSetupAccount } from "@/models/settings/accountingAiSetup";

/** Same columns as `templates/ledger_accounts/template_ledger_accounts.csv`. */
const EXPORT_COLUMNS = [
  "code",
  "name",
  "parent_code",
  "description",
  "account_type",
  "statement_section",
  "normal_balance",
  "is_active",
  "is_bank_control",
  "allows_manual_posting",
  "report_group",
  "report_subgroup",
  "external_ref",
  "currency_code",
  "metadata",
] as const;

type ExportColumn = (typeof EXPORT_COLUMNS)[number];

function flatten(value: unknown): string {
  return String(value ?? "").replace(/\r?\n/g, " ").trim();
}

function rowFor(account: AiSetupAccount): Record<ExportColumn, string> {
  const header = account.account_type === "header";
  return {
    code: flatten(account.code),
    name: flatten(account.name),
    parent_code: flatten(account.parent_code),
    description: flatten(account.description),
    account_type: flatten(account.account_type),
    statement_section: flatten(account.statement_section),
    normal_balance: flatten(account.normal_balance),
    is_active: account.is_active === false ? "false" : "true",
    is_bank_control: account.is_bank_control ? "true" : "false",
    // Headers are structural; only posting accounts may allow manual posting.
    allows_manual_posting: header ? "false" : account.allows_manual_posting === false ? "false" : "true",
    report_group: flatten(account.report_group),
    report_subgroup: flatten(account.report_subgroup),
    external_ref: flatten(account.external_ref),
    currency_code: flatten(account.currency_code),
    metadata: "{}",
  };
}

function ordered(accounts: AiSetupAccount[]): AiSetupAccount[] {
  return [...accounts].sort((left, right) =>
    String(left.sort_key || left.path || left.code).localeCompare(String(right.sort_key || right.path || right.code))
  );
}

function cell(value: string, delimiter: string): string {
  return value.includes(delimiter) || /["\r\n]/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function serialize(accounts: AiSetupAccount[], delimiter: string, eol: string): string {
  const rows = [
    EXPORT_COLUMNS.join(delimiter),
    ...ordered(accounts).map(account => {
      const row = rowFor(account);
      return EXPORT_COLUMNS.map(column => cell(row[column], delimiter)).join(delimiter);
    }),
  ];
  return rows.join(eol) + eol;
}

/** CSV file compatible with the Chart setup CSV importer. */
export function buildChartCsv(accounts: AiSetupAccount[]): string {
  return serialize(accounts, ",", "\r\n");
}

/** Clipboard text compatible with Chart setup -> Paste rows manually. */
export function buildChartManualText(accounts: AiSetupAccount[]): string {
  return serialize(accounts, ";", "\n");
}

export function downloadChartCsv(accounts: AiSetupAccount[], filename = "spifex-chart-of-accounts.csv"): void {
  const blob = new Blob(["\ufeff", buildChartCsv(accounts)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

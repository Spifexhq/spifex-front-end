export type ManualIssueCode =
  | "missing_header"
  | "no_rows"
  | "empty_value"
  | "invalid_choice"
  | "invalid_boolean"
  | "duplicate_code"
  | "unknown_parent"
  | "invalid_json"
  | "unusual_balance";

export type ManualIssue = {
  code: ManualIssueCode;
  line?: number;
  params: Record<string, string | number>;
};

export type ManualValidation = {
  rowCount: number;
  columnCount: number;
  headers: string[];
  errors: ManualIssue[];
  warnings: ManualIssue[];
  valid: boolean;
};

const HEADER_ALIASES: Record<string, readonly string[]> = {
  code: ["code", "account_code", "gl_code"],
  name: ["name", "account", "account_name"],
  parent_code: ["parent_code", "parent", "parent_account_code"],
  description: ["description", "details"],
  account_type: ["account_type", "type"],
  statement_section: ["statement_section", "section", "classification", "nature"],
  normal_balance: ["normal_balance", "balance_side", "default_tx"],
  is_active: ["is_active", "active"],
  is_bank_control: ["is_bank_control", "bank_control"],
  allows_manual_posting: ["allows_manual_posting", "manual_posting"],
  report_group: ["report_group", "group"],
  report_subgroup: ["report_subgroup", "subgroup"],
  external_ref: ["external_ref", "external_reference"],
  currency_code: ["currency_code", "currency"],
  metadata: ["metadata"],
};

const REQUIRED_HEADERS = ["code", "name", "account_type", "statement_section", "normal_balance"] as const;
const ACCOUNT_TYPES = new Set(["header", "posting"]);
const STATEMENT_SECTIONS = new Set(["asset", "liability", "equity", "income", "expense", "off_balance", "statistical"]);
const NORMAL_BALANCES = new Set(["debit", "credit"]);
const BOOLEAN_VALUES = new Set(["1", "true", "t", "yes", "y", "0", "false", "f", "no", "n"]);
const DEBIT_SECTIONS = new Set(["asset", "expense", "off_balance", "statistical"]);
const CREDIT_SECTIONS = new Set(["liability", "equity", "income"]);

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

/** Split one CSV line, honouring double quotes and escaped quotes. */
export function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function resolveHeaders(cells: string[]): { map: Record<string, number>; missing: string[] } {
  const map: Record<string, number> = {};
  cells.map(normalizeHeader).forEach((header, index) => {
    for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(header) && map[canonical] === undefined) {
        map[canonical] = index;
        break;
      }
    }
  });
  return { map, missing: REQUIRED_HEADERS.filter(header => map[header] === undefined) };
}

/** Spreadsheet paste is tab-separated; the backend parser expects commas or semicolons. */
export function normalizeManualText(text: string): string {
  if (!text.includes("\t")) return text;
  return text.split(/\r?\n/).map(line => line.replace(/\t/g, ";")).join("\n");
}

export function validateManualText(text: string): ManualValidation {
  const lines = normalizeManualText(text || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const empty: ManualValidation = { rowCount: 0, columnCount: 0, headers: [], errors: [], warnings: [], valid: false };
  if (!lines.length) return empty;

  const delimiter = splitDelimitedLine(lines[0], ";").length > 1 ? ";" : ",";
  const headerCells = splitDelimitedLine(lines[0], delimiter);
  const { map, missing } = resolveHeaders(headerCells);
  const headers = Object.entries(map).sort((a, b) => a[1] - b[1]).map(([canonical]) => canonical);
  const errors: ManualIssue[] = [];
  const warnings: ManualIssue[] = [];

  if (missing.length) errors.push({ code: "missing_header", params: { columns: missing.join(", ") } });

  const rows = lines.slice(1).map((line, index) => ({ line: index + 2, cells: splitDelimitedLine(line, delimiter) }));
  if (!rows.length) errors.push({ code: "no_rows", params: {} });

  const seenCodes = new Map<string, number>();
  const parsed: Array<{ line: number; code: string; parent: string; section: string; balance: string }> = [];

  for (const row of rows) {
    const get = (column: string) => {
      const index = map[column];
      return index === undefined ? "" : (row.cells[index] ?? "").trim();
    };
    const code = get("code");
    const name = get("name");
    const section = get("statement_section");
    const type = get("account_type");
    const balance = get("normal_balance");

    if (!code) errors.push({ code: "empty_value", line: row.line, params: { column: "code" } });
    if (!name) errors.push({ code: "empty_value", line: row.line, params: { column: "name" } });
    if (section && !STATEMENT_SECTIONS.has(section)) {
      errors.push({ code: "invalid_choice", line: row.line, params: { column: "statement_section", allowed: [...STATEMENT_SECTIONS].join(", ") } });
    }
    if (!section) errors.push({ code: "empty_value", line: row.line, params: { column: "statement_section" } });
    if (type && !ACCOUNT_TYPES.has(type)) {
      errors.push({ code: "invalid_choice", line: row.line, params: { column: "account_type", allowed: [...ACCOUNT_TYPES].join(", ") } });
    }
    if (balance && !NORMAL_BALANCES.has(balance)) {
      errors.push({ code: "invalid_choice", line: row.line, params: { column: "normal_balance", allowed: [...NORMAL_BALANCES].join(", ") } });
    }
    for (const column of ["is_active", "is_bank_control", "allows_manual_posting"]) {
      const value = get(column).toLowerCase();
      if (value && !BOOLEAN_VALUES.has(value)) errors.push({ code: "invalid_boolean", line: row.line, params: { column } });
    }
    const metadata = get("metadata");
    if (metadata) {
      try {
        JSON.parse(metadata);
      } catch {
        errors.push({ code: "invalid_json", line: row.line, params: { column: "metadata" } });
      }
    }
    if (code) {
      const previous = seenCodes.get(code);
      if (previous !== undefined) errors.push({ code: "duplicate_code", line: row.line, params: { code } });
      else seenCodes.set(code, row.line);
    }
    if (balance && section) {
      const expected = DEBIT_SECTIONS.has(section) ? "debit" : CREDIT_SECTIONS.has(section) ? "credit" : "";
      if (expected && balance !== expected) warnings.push({ code: "unusual_balance", line: row.line, params: { section, balance, expected } });
    }
    parsed.push({ line: row.line, code, parent: get("parent_code"), section, balance });
  }

  for (const row of parsed) {
    if (row.parent && !seenCodes.has(row.parent)) warnings.push({ code: "unknown_parent", line: row.line, params: { code: row.parent } });
  }

  return {
    rowCount: rows.length,
    columnCount: headers.length,
    headers,
    errors,
    warnings,
    valid: rows.length > 0 && missing.length === 0 && errors.length === 0,
  };
}

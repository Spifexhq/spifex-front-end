export type PnlSource = "cash_settled" | "cash_committed" | "ledger";
export type PnlTreatment =
  | "operating_revenue"
  | "revenue_deduction"
  | "cost_of_sales"
  | "operating_expense"
  | "depreciation"
  | "financial_income"
  | "financial_expense"
  | "income_tax"
  | "other"
  | "exclude"
  | "unclassified";

export interface PnlLine {
  code: string;
  name: string;
  section: string;
  parent: string | null;
  sort: number;
  is_subtotal: boolean;
  formula: string | null;
  is_system: boolean;
  is_active: boolean;
}

export interface PnlCategoryMapping {
  id: string;
  category_id: string;
  code: string;
  name: string;
  line: string | null;
  treatment: PnlTreatment;
  effective_from: string;
  effective_to: string | null;
}

export interface PnlAccountMapping {
  id: string;
  book_id: string;
  ledger_account_id: string | null;
  report_group: string | null;
  line: string;
  effective_from: string;
  effective_to: string | null;
}

export interface PnlUnmappedCategory {
  id: string;
  code: string;
  name: string;
}

export interface PnlConfig {
  enabled: boolean;
  accounting_enabled: boolean;
  source_mode: PnlSource;
  template_code: string;
  mapping_version: number;
  base_currency: string;
  today: string;
  lines: PnlLine[];
  category_mappings: PnlCategoryMapping[];
  account_mappings: PnlAccountMapping[];
  unmapped_categories: PnlUnmappedCategory[];
  can_manage: boolean;
}

export interface PnlReportLine {
  code: string;
  label: string;
  amount: string;
  previous?: string | null;
}

export interface PnlReportSection {
  key: string;
  label: string;
  lines: PnlReportLine[];
  total: string;
}

export interface PnlReportWarning {
  code: string;
  count?: number;
  message?: string;
  items?: Array<Record<string, unknown>>;
}

export interface PnlReportPayload {
  period: { start: string; end: string };
  source: PnlSource;
  basis: "cash" | "issued" | "accrual_ledger";
  label: string;
  is_statutory: boolean;
  base_currency: string;
  book: string | null;
  book_code: string | null;
  template_code: string;
  mapping_version: number;
  generated_at: string;
  finalized: boolean;
  sections: PnlReportSection[];
  subtotals: Record<string, string>;
  warnings: PnlReportWarning[];
  comparison?: {
    period: { start: string; end: string } | null;
    subtotals: Record<string, string> | null;
  };
}

export interface PnlReportResponse {
  report: PnlReportPayload;
}

export interface PnlFinalizeResponse {
  report: PnlReportPayload;
  snapshot_id: string;
  checksum: string;
}

/* ------------------------- Financial feature state ------------------------ */

export interface FinancialFeatureModule {
  available: boolean;
  enabled: boolean;
  can_enable: boolean;
  can_disable: boolean;
  enabled_at: string | null;
}

export interface FinancialFeaturesResponse {
  product_category: string;
  cash_flow: { available: boolean };
  accounting: FinancialFeatureModule & {
    operational: boolean;
    setup_status: string | null;
    requires_disable_acknowledgement: boolean;
    disable_blockers: Record<string, number>;
  };
  pnl: FinancialFeatureModule & {
    source_mode: PnlSource;
    ledger_source_available: boolean;
    template_code: string | null;
    mapping_version: number;
  };
  can_manage: boolean;
}

export interface UpdateFinancialFeaturesRequest {
  accounting_enabled?: boolean;
  pnl_enabled?: boolean;
  pnl_source_mode?: PnlSource;
  acknowledge_posting_gap?: boolean;
  acknowledge_ledger_source?: boolean;
  reason?: string;
  current_password: string;
}

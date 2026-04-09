// src\models\settings\ledgerAccounts.ts
import type { Paginated } from "@/models/Api";

export type LedgerMode = "personal" | "organizational";

export type LedgerAccountType = "header" | "posting";

export type LedgerStatementSection =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense"
  | "off_balance"
  | "statistical";

export type LedgerNormalBalance = "debit" | "credit";

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_id?: string | null;

  account_type: LedgerAccountType;
  statement_section: LedgerStatementSection;
  normal_balance: LedgerNormalBalance;

  is_active: boolean;
  is_system: boolean;
  is_bank_control: boolean;
  allows_manual_posting: boolean;

  report_group?: string;
  report_subgroup?: string;
  external_ref?: string;
  currency_code?: string;
  metadata?: string | Record<string, unknown>;

  depth: number;
  path?: string;
}

export interface LedgerAccountsExistsResponse {
  exists: boolean;
}

export interface GetLedgerAccountsRequest {
  active?: "true" | "false";
  q?: string;
  account_type?: LedgerAccountType;
  statement_section?: LedgerStatementSection;
  parent_id?: string;
  root_only?: "true" | "false";
  leaf_only?: "true" | "false";
  is_bank_control?: "true" | "false";
  allows_manual_posting?: "true" | "false";
  page_size?: number;
  cursor?: string;
}

export type GetLedgerAccountsResponse = Paginated<LedgerAccount>;

export interface AddLedgerAccountRequest {
  code: string;
  name: string;
  description?: string;
  parent_id?: string | null;

  account_type: LedgerAccountType;
  statement_section: LedgerStatementSection;
  normal_balance: LedgerNormalBalance;

  is_active?: boolean;
  is_system?: boolean;
  is_bank_control?: boolean;
  allows_manual_posting?: boolean;

  report_group?: string;
  report_subgroup?: string;
  external_ref?: string;
  currency_code?: string;
  metadata?: Record<string, unknown>;
}

export type EditLedgerAccountRequest = Partial<AddLedgerAccountRequest>;

export interface LedgerAccountsBulkRequest {
  ids: string[];
}

export type LedgerAccountsBulkResponse = LedgerAccount[];

export interface ImportLedgerAccountsResponse {
  created_count: number;
  accounts: LedgerAccount[];
}

export interface ImportStandardLedgerAccountsRequest {
  plan: "personal" | "organizational" | "default";
}

export type ImportStandardLedgerAccountsResponse = ImportLedgerAccountsResponse;

export interface DeleteAllLedgerAccountsRequest {
  confirm_delete_all: true;
}

export interface DeleteAllLedgerAccountsResponse {
  message: string;
  deleted_count: number;
}

export interface GetLedgerAccountsTreeRequest {
  active?: "true" | "false";
}

export interface GetLedgerAccountsTreeNode {
  external_id: string;
  parent__external_id?: string | null;
  code: string;
  name: string;
  account_type: LedgerAccountType;
  statement_section: LedgerStatementSection;
  normal_balance: LedgerNormalBalance;
  is_bank_control: boolean;
  allows_manual_posting: boolean;
  report_group?: string;
  report_subgroup?: string;
  depth: number;
  path?: string;
  is_active: boolean;
}

export interface GetLedgerAccountsTreeResponseEnvelope {
  items: GetLedgerAccountsTreeNode[];
}

export type GetLedgerAccountsTreeResponse = GetLedgerAccountsTreeNode[];

export interface LedgerProfile {
  mode: LedgerMode;
  default_template: string;
  language_code: string;
  use_compact_cashflow_view: boolean;
  auto_bootstrapped_at?: string | null;
}
// src/models/settings/banking.ts
import type { Paginated } from "@/models/Api";

/* -------------------------------------------------------------------------- */
/* Core model (full) – used in settings pages, modals, etc.                    */
/* -------------------------------------------------------------------------- */
export interface BankAccount {
  id: string;
  institution: string;
  account_type: string;
  currency: string;
  branch: string;
  account_number: string;
  iban?: string;
  initial_balance: string;
  current_balance: string;
  consolidated_balance: string;
  is_active: boolean;
}

/* -------------------------------------------------------------------------- */
/* Table row model (compact) – returned by banking/accounts/table/             */
/* -------------------------------------------------------------------------- */
export interface BankAccountTableRow {
  id: string;
  institution: string;
  branch: string;
  account_number: string;
  consolidated_balance: string | null;

  iban?: string;
  currency?: string;
  is_active?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Params                                                                      */
/* -------------------------------------------------------------------------- */

export interface GetBanksParams {
  cursor?: string;
  institution?: string;
  account_type?: string;
  branch?: string;
  account_number?: string;
  iban?: string;
  active?: "true" | "false";
}

/**
 * Table endpoint payload (POST).
 * - ids omitted or [] => backend returns all banks (subject to active)
 * - ids provided => backend returns only those banks
 */
export interface GetBanksTableParams {
  active?: boolean;     // default on backend: true
  include_history?: boolean;
  ids?: string[];       // keep ONLY in payload
}

/* -------------------------------------------------------------------------- */
/* Requests / Responses                                                        */
/* -------------------------------------------------------------------------- */

export type GetBanksResponse = Paginated<BankAccount>;

export interface GetBanksBulkRequest {
  ids: string[];
}
export type GetBanksBulkResponse = BankAccount[];

export type AddBankRequest = Omit<BankAccount, "id" | "current_balance" | "consolidated_balance">;
export type EditBankRequest = Partial<AddBankRequest>;

export type GetBankResponse = BankAccount;
export type AddBankResponse = BankAccount;
export type EditBankResponse = BankAccount;

/** Table endpoint response */
export interface GetBanksTableResponse {
  balance_history?: { date: string; value: string }[];
  balance_currency?: string | null;
  mixed_currencies?: boolean;
  can_view_balance?: boolean;
  /** Workspace base/reporting currency for the base-equivalent total. */
  base_currency?: string | null;
  /** Base-equivalent total; null when a required rate is missing. */
  total_base_balance?: string | null;
  /** Native totals grouped by currency code. */
  totals_by_currency?: Record<string, string>;
  rate_date?: string | null;
  rate_is_stale?: boolean;
  rates_missing?: string[];
  banks: BankAccountTableRow[];
  count: number;
  /** Native total for a single-currency selection; null when currencies mix. */
  total_consolidated_balance: string | null;
}

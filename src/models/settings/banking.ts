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
  consolidated_balance: string;

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
  banks: BankAccountTableRow[];
  count: number;
  total_consolidated_balance: string;
}

// src/models/settings/banking.ts
import type { Paginated } from "@/models/Api";

export interface BankAccount {
  id: string;
  institution: string;
  account_type: string;
  currency: string;
  branch: string;
  account_number: string;
  iban?: string;
  initial_balance: string;        // "1234.56"
  current_balance: string;        // "…"
  consolidated_balance: string;   // "…"
  is_active: boolean;
}

export interface GetBanksParams {
  cursor?: string;
  institution?: string;
  account_type?: string;
  branch?: string;
  account_number?: string;
  iban?: string;
  active?: "true" | "false";
}

/* ----------------------------- Requests / Responses ---------------------------- */

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

/**
 * Keep as unknown if backend varies. If it is always empty, switch to void.
 */
export type DeleteBankResponse = unknown;

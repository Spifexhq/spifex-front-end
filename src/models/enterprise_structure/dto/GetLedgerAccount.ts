import { LedgerAccount } from "../domain/LedgerAccount";

export interface GetLedgerAccounts {
  general_ledger_accounts: LedgerAccount[];
}

export interface GetLedgerAccount {
  general_ledger_account: LedgerAccount;
}

export interface LedgerAccountPayloadBase {
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: string;
}

export type AddLedgerAccountRequest = LedgerAccountPayloadBase;
export type EditLedgerAccountRequest = LedgerAccountPayloadBase;

export interface LedgerAccount {
  id: number;
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: string;
  uuid_general_ledger_account: string | null;
};

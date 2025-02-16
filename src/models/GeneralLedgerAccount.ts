export type GeneralLedgerAccount = {
  id: number;
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: string;
  uuid_general_ledger_account: string;
};

export type ApiGetGeneralLedgerAccounts = {
  general_ledger_accounts: GeneralLedgerAccount[];
};

export type ApiGetGeneralLedgerAccount = {
  general_ledger_account: GeneralLedgerAccount;
};

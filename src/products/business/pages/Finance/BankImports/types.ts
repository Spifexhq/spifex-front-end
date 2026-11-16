/** Shared prop contracts for the statement import flow. */
export type BankOption = {
  id: string;
  institution: string;
  account_number?: string;
  iban?: string;
  currency?: string;
};

export type BankLoader = (activeOnly: boolean) => Promise<BankOption[]>;

export type BankImportsPermissions = {
  add: boolean;
  change: boolean;
  delete: boolean;
  viewBanks: boolean;
};

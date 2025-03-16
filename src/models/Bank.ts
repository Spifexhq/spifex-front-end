export type Bank = {
  id: number;
  bank_institution: string;
  bank_account_type: string;
  bank_branch: string;
  bank_account: string;
  initial_balance: number;
  current_balance: number;
  consolidated_balance: number;
  bank_status: boolean;
};

export type ApiGetBanks = {
  banks: Bank[];
};

export type ApiGetBank = {
  banks: Bank[];
};

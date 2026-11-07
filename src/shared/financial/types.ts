export type CashflowBalance = {
  currency: string;
  balance: string;
  pending_income: string;
  pending_expense: string;
  projected_balance: string;
  accounts: { id: string; name: string; balance: string; is_active: boolean }[];
};

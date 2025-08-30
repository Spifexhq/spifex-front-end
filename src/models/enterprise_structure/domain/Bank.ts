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
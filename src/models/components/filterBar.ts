// src/models/components/filterBar.ts

export interface EntryFilters {
  settlement_status?: boolean;
  start_date?: string;
  end_date?: string;
  description?: string;
  observation?: string;
  tx_type?: "credit" | "debit";
  amount_min?: string;
  amount_max?: string;
  bank_id?: string[];
  cashflow_category_id?: string[];
}

export type ChipKey =
  | "date"
  | "banks"
  | "categories"
  | "observation"
  | "tx_type"
  | "amount";

export interface LocalFilters {
  settlement_status: boolean;
  start_date: string;
  end_date: string;
  description: string;
  observation: string;
  tx_type?: "credit" | "debit";
  amount_min: string;
  amount_max: string;
  bank_id: string[];
  cashflow_category_id: string[];
}

export type Visualization = {
  id: string;
  name: string;
  is_default?: boolean;
  settlement_status?: boolean;
  filters: EntryFilters;
};

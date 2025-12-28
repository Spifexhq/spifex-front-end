// src/models/components/filterBar.ts

export type EntryFilters = {
  start_date?: string;
  end_date?: string;
  description?: string;
  observation?: string;
  gla_id?: string[];
  bank_id?: string[];
  tx_type?: "credit" | "debit";
  amount_min?: string;
  amount_max?: string;
  settlement_status?: boolean;
};

export type ChipKey =
  | "date"
  | "banks"
  | "accounts"
  | "observation"
  | "tx_type"
  | "amount";

export type LocalFilters =
  Omit<EntryFilters, "gla_id" | "bank_id" | "amount_min" | "amount_max"> & {
    gla_id: string[];
    bank_id: string[];
    amount_min?: string;
    amount_max?: string;
  };

export type Visualization = {
  id: string;
  name: string;
  is_default: boolean;
  filters: LocalFilters;
  settlement_status: boolean;
};

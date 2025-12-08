// src/models/entries/domain/FilterBar.ts
import type { EntryFilters } from "./EntryFilters";

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

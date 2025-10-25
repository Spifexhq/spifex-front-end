// src/models/entries/domain/FilterBar.ts (or wherever LocalFilters is declared)
import type { EntryFilters } from "../domain";

/** Chips & menus */
export type ChipKey =
  | "date"
  | "banks"
  | "accounts"
  | "observation"
  | "tx_type"
  | "amount";

/** LocalFilters: UI strings for amounts; arrays for pickers */
export type LocalFilters =
  Omit<EntryFilters, "gla_id" | "bank_id" | "amount_min" | "amount_max"> & {
    gla_id: string[];
    bank_id: string[];
    tx_type?: "credit" | "debit";
    amount_min?: string;  // UI decimal string
    amount_max?: string;  // UI decimal string
  };

/** Saved visualization payload (no group_by) */
export type Visualization = {
  id: string;
  name: string;
  is_default: boolean;
  filters: LocalFilters;
  settlement_status: boolean;
};

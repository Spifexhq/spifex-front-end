// src/models/entries/settlements.ts
import type { Paginated } from "@/models/Api";
import type { Entry } from "./entries";
import type { BankAccount } from "@/models/settings/banking";

/* ---------------------------------- Query ---------------------------------- */

export interface GetSettledEntryRequest {
  page_size?: number;
  cursor?: string;

  value_from?: string; // YYYY-MM-DD
  value_to?: string;   // YYYY-MM-DD
  bank?: string;

  q?: string;
  description?: string;
  observation?: string;

  ledger_account?: string;
  project?: string;
  entity?: string;

  tx_type?: number;
  amount_min?: number;
  amount_max?: number;

  include_inactive?: boolean;
}

/**
 * Matches settled entries list/table endpoints
 */
export type GetSettledEntryResponse = Paginated<SettledEntry> & {
  running_seed_minor?: number;
  running_seed?: string;
};

/* ---------------------------------- Read ---------------------------------- */

export interface SettledEntry {
  id: string;
  organization: string;

  description: string;
  observation: string | null;
  notes: string | null;

  amount: string; // decimal string
  tx_type: string;

  value_date: string; // YYYY-MM-DD
  settled_on: string; // ISO datetime
  partial_index: number | null;

  document_type: string | null;
  installment_group_id: string | null;
  installment_index: number | null;
  installment_count: number | null;
  interval_months: number;
  weekend_action: number;

  ledger_account: string | null;
  project: string | null;
  entity: string | null;
  transfer_id: string | null;

  departments: Array<{
    department_id: string | null;
    code: string;
    name: string;
    percent: string;
  }>;

  items: Array<{
    item_id: string | null;
    sku: string;
    name: string;
    quantity: string;
  }>;

  external_id: string;
  entry_id: string;
  bank: BankAccount | null;

  running_balance?: string | null;
}

/* ---------------------------------- Write ---------------------------------- */

export interface EditSettledEntryRequest {
  value_date: string; // YYYY-MM-DD
}

/* ------------------------------ Bulk settle ------------------------------ */

export interface BulkSettleItem {
  entry_id: string;
  bank_id: string;
  amount: string;     // decimal string
  value_date: string; // YYYY-MM-DD
}

export interface BulkSettleRequest {
  items: BulkSettleItem[];
  atomic?: boolean;
}

export type BulkSettleError = {
  id?: string;
  entry_id?: string;
  error: string;
};

export type BulkSettleResponse =
  | { updated: Entry[] }
  | { updated: Entry[]; errors: BulkSettleError[] };

/* ------------------------------ Bulk delete ------------------------------ */

export interface DeleteSettledEntriesBulkRequest {
  ids: string[];
}

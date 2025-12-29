// src/models/entries/entries.ts
import type { Paginated } from "@/models/Api";

import type { DepartmentAllocation } from "../settings/departments";
import type { InventoryAllocation } from "@/models/settings/inventory";

/* ---------------------------------- List ---------------------------------- */


/** Matches /<org>/cashflow/entries/ query params */
export interface GetEntryRequest {
  page_size?: number;
  cursor?: string;

  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  q?: string;         // free text over description/observation/notes

  description?: string; // backend supports icontains on description
  observation?: string; // backend supports icontains on observation

  ledger_account?: string;       // GL external_id (CSV if multiple)
  project?: string;  // Project external_id
  entity?: string;   // Entity external_id

  amount_min?: number;
  amount_max?: number;

  group?: string;    // installment_group_id
  tx_type?: number;  // backend accepts TxType enum ints (e.g., -1/1) if used

  bank?: string;
  running_seed_minor?: number;
  running_seed?: string;
}

export type GetEntryResponse = Paginated<Entry>;

/* ---------------------------------- Read ---------------------------------- */
/**
 * Entry coming from EntryReadSerializer
 * - id is the entry external_id (string)
 * - relateds are flat external_ids (strings) instead of nested objects
 * - departments/items are snapshot arrays
 */
export interface Entry {
  id: string;               // entry.external_id
  due_date: string;         // YYYY-MM-DD
  description: string;
  observation: string | null;
  notes: string | null;

  amount: string;           // decimal as string
  tx_type: string;          // "credit"/"debit" label

  installment_group_id: string | null;
  installment_index: number | null;
  installment_count: number | null;

  interval_months: number;
  weekend_action: number;

  last_settled_on: string | null;       // ISO datetime or null
  settlement_value_date: string | null; // YYYY-MM-DD or null
  is_settled: boolean;

  ledger_account: string | null; // GL external_id
  project: string | null;    // Project external_id
  entity: string | null;     // Entity external_id
  transfer_id: string | null; // Transfer external_id

  departments: DepartmentAllocation[]; // snapshot list
  items: InventoryAllocation[];        // snapshot list

  running_balance?: string | null;
}

/* ---------------------------------- Write ---------------------------------- */

export type EntryTxTypeLabel = "credit" | "debit" | string;

/** Matches EntryWriteSerializer (create/update) */
export interface EntryPayloadBase {
  due_date: string; // YYYY-MM-DD
  description?: string;
  observation?: string | null;
  notes?: string | null;

  amount: string; // "1234.56"
  tx_type: EntryTxTypeLabel; // server is flexible on strings

  installment_count?: number | null;
  installment_index?: number | null;

  interval_months?: number; // int choice
  weekend_action?: number;  // int choice

  ledger_account: string;        // GL external_id (required on create)
  document_type?: string | null;
  project?: string | null;   // Project external_id
  entity?: string | null;    // Entity external_id

  departments?: Array<{
    department_id: string; // Department external_id
    percent: string;       // "100.00"
  }>;

  items?: Array<{
    item_id: string;   // InventoryItem external_id
    quantity: string;  // "1.000"
  }>;
}

export type AddEntryRequest = EntryPayloadBase;
export type EditEntryRequest = Partial<EntryPayloadBase>;

/* ------------------------------ Bulk operations ------------------------------ */

export interface GetEntriesBulkRequest {
  ids: string[];
}

export type GetEntriesBulkResponse = Entry[];

export interface DeleteEntriesBulkRequest {
  ids: string[];
}

export interface EditEntriesBulkRequest {
  ids: string[];
  data: Partial<EditEntryRequest>;
  atomic?: boolean;
}

export interface EditEntriesBulkSuccess {
  updated: Entry[];
}

export interface EditEntriesBulkPartialError {
  id: string;
  error: string;
}

export interface EditEntriesBulkPartial {
  updated: Entry[];
  errors: EditEntriesBulkPartialError[];
}

export type EditEntriesBulkResponse = EditEntriesBulkSuccess | EditEntriesBulkPartial;

/* --------------------------- Create/Edit response union --------------------------- */

export type EntryWriteResponse = Entry | Entry[];

import type { Paginated } from "@/models/Api";

import type { DepartmentAllocation } from "../settings/departments";
import type { InventoryAllocation } from "@/models/settings/inventory";
import type { AccountingReadiness } from "./accountingReadiness";

export interface GetEntryRequest {
  page_size?: number;
  cursor?: string;

  date_from?: string;
  date_to?: string;
  q?: string;

  description?: string;
  observation?: string;

  cashflow_category?: string;
  project?: string;
  entity?: string;

  amount_min?: number;
  amount_max?: number;

  group?: string;
  tx_type?: number;

  bank?: string;
  total_consolidated_balance?: string;
}

export type GetEntryResponse = Paginated<Entry>;

export interface Entry {
  id: string;
  due_date: string;
  description: string;
  observation: string | null;
  notes: string | null;

  amount: string;
  open_amount?: string;
  tx_type: string;

  installment_group_id: string | null;
  installment_index: number | null;
  installment_count: number | null;

  interval_months: number;
  weekend_action: number;

  last_settled_on: string | null;
  settlement_value_date: string | null;
  is_settled: boolean;

  cashflow_category: string | null;
  project: string | null;
  entity: string | null;
  transfer_id: string | null;

  departments: DepartmentAllocation[];
  items: InventoryAllocation[];

  running_balance?: string | null;
  accounting?: AccountingReadiness | null;
}

export type EntryTxTypeLabel = "credit" | "debit" | string;

export interface EntryPayloadBase {
  due_date: string;
  description?: string;
  observation?: string | null;
  notes?: string | null;

  amount: string;
  tx_type: EntryTxTypeLabel;

  installment_count?: number | null;
  installment_index?: number | null;

  interval_months?: number;
  weekend_action?: number;

  cashflow_category?: string | null;
  document_type?: string | null;
  project?: string | null;
  entity?: string | null;

  departments?: Array<{
    department_id: string;
    percent: string;
  }>;

  items?: Array<{
    item_id: string;
    quantity: string;
  }>;
}

export type AddEntryRequest = EntryPayloadBase;
export type EditEntryRequest = Partial<EntryPayloadBase>;

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
export type EntryWriteResponse = Entry | Entry[];
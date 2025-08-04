import { Entry } from "../domain";

export interface GetEntryRequest {
  page_size?: number;
  cursor?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  observation?: string;
  general_ledger_account_id?: string;
}

export interface CursorLinks {
  next: string | null;
  previous: string | null;
}

export interface GetEntryResponse extends CursorLinks {
  results: Entry[];
}

// Payload
export interface EntryPayloadBase {
  due_date: string;
  description?: string;
  observation?: string | null;
  amount: string;
  current_installment: number | null;
  total_installments: number | null;
  tags?: string | null;
  transaction_type?: string;
  notes?: string | null;
  periods?: string | null;
  weekend_action?: string | null;
  general_ledger_account_id?: string | null;
  document_type_id?: string | null;
  project_id?: string | null;
  entity_id?: string | null;
  department_id?: string | null;
  department_percentage?: string | null;
  inventory_item_id?: number | null;
  inventory_item_quantity?: number | null;
};

export type AddEntryRequest = EntryPayloadBase;

export type EditEntryRequest = Partial<EntryPayloadBase>;
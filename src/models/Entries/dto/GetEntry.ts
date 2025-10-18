// models/entries/dto/GetEntry.ts
import { Entry } from "../domain";

/** Matches /<org>/cashflow/entries/ query params */
export interface GetEntryRequest {
  page_size?: number;
  cursor?: string;

  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  q?: string;         // free text over description/observation/notes

  description?: string;   // backend supports icontains on description
  observation?: string;   // backend supports icontains on observation

  gl?: string;        // GL external_id (CSV if multiple)
  project?: string;   // Project external_id
  entity?: string;    // Entity external_id

  amount_min?: number;
  amount_max?: number;

  group?: string;     // installment_group_id
  tx_type?: number;   // if you need it: backend accepts TxType enum ints
  settled?: "1" | "0" | "true" | "false" | "yes" | "no"; // accepted; server enforces false for list

  bank?: string;
  running_seed_minor?: number;
  running_seed?: string;
}

export interface CursorLinks {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface GetEntryResponse extends CursorLinks {
  results: Entry[];
}

/** Matches EntryWriteSerializer (create/update) */
export interface EntryPayloadBase {
  due_date: string;                       // YYYY-MM-DD
  description?: string;
  observation?: string | null;
  notes?: string | null;

  amount: string;                         // "1234.56"
  tx_type: "credit" | "debit" | string;   // server is flexible on strings

  installment_count?: number | null;
  installment_index?: number | null;

  interval_months?: number;               // int choice
  weekend_action?: number;                // int choice

  gl_account: string;                     // GL external_id (required on create)
  document_type?: string | null;          // optional free string as in backend serializer
  project?: string | null;                // Project external_id
  entity?: string | null;                 // Entity external_id

  departments?: Array<{
    department_id: string;                // Department external_id
    percent: string;                      // "100.00"
  }>;

  items?: Array<{
    item_id: string;                      // InventoryItem external_id
    quantity: string;                     // "1.000"
  }>;
}

export type AddEntryRequest = EntryPayloadBase;
export type EditEntryRequest = Partial<EntryPayloadBase>;

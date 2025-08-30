import { SettledEntry } from "../domain";

export interface GetSettledEntryRequest {
  page_size?: number;
  cursor?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  observation?: string;
  general_ledger_account_id?: string;
  bank_id?: string;
}

export interface SECursorLinks {
  next: string | null;
  previous: string | null;
}

// Payload
export interface GetSettledEntry extends SECursorLinks {
  results: SettledEntry[];
}

export type SettledEntryPayloadBase = {
  settlement_due_date: string;
  bank_id?: string;
  is_partial: boolean;
  partial_amount?: string;
};

export type EditSettledEntryRequest = SettledEntryPayloadBase;

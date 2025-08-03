import { SettledEntry } from "../domain";

export interface GetSettledEntryParams {
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

export interface GetSettledEntry extends SECursorLinks {
  results: SettledEntry[];
}
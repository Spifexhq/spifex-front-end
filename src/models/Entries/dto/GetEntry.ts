import { Entry } from "../domain";

export interface GetEntryParams {
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

export interface GetEntry extends CursorLinks {
  results: Entry[];
}

import { SettledEntry } from "../domain";

/** Matches /cashflow/settlements/ list query */
export interface GetSettledEntryRequest {
  page_size?: number;
  cursor?: string;

  /** filter by settlement value_date range */
  value_from?: string; // YYYY-MM-DD
  value_to?: string;   // YYYY-MM-DD

  /** filter by "settled_on" (when settlement was created) */
  settled_from?: string; // YYYY-MM-DD
  settled_to?: string;   // YYYY-MM-DD

  /** bank external_id */
  bank?: string;

  /** entry external_id */
  entry?: string;

  /** free text over entry.{description,observation,notes,document_type} */
  q?: string;
}

export interface SECursorLinks {
  next: string | null;
  previous: string | null;
}

export interface GetSettledEntry extends SECursorLinks {
  results: SettledEntry[];
}

/**
 * Single-settlement PATCH payload (server allows updating value_date only).
 * For creating settlements you POST to /entries/{entry_id}/settlements/
 * with { bank_id, amount | amount_minor, value_date } — that uses a different DTO.
 */
export interface EditSettledEntryRequest {
  value_date: string; // YYYY-MM-DD
}

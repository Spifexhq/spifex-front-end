import { SettledEntry } from "../domain";

/** Matches /cashflow/settlements/ list query */
export interface GetSettledEntryRequest {
  page_size?: number;
  cursor?: string;

  // existing
  value_from?: string;          // YYYY-MM-DD
  value_to?: string;            // YYYY-MM-DD
  bank?: string;                // single bank external_id (as used today)
  q?: string;                   // free text

  // ✅ add these to match backend filters (parallel to entries)
  description?: string;         // icontains
  observation?: string;         // icontains

  gl?: string;                  // GL external_id (first selected)
  project?: string;             // if you want later
  entity?: string;              // if you want later

  tx_type?: number;             // -1 | 1
  amount_min?: number;          // minor units
  amount_max?: number;          // minor units
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

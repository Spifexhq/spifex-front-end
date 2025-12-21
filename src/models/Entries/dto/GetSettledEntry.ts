import { SettledEntry } from "../domain/SettledEntry";

export interface GetSettledEntryRequest {
  page_size?: number;
  cursor?: string;
  value_from?: string;
  value_to?: string;
  bank?: string;

  q?: string;
  description?: string;
  observation?: string;

  gl?: string;
  project?: string;
  entity?: string;

  tx_type?: number;
  amount_min?: number;
  amount_max?: number;

  include_inactive?: boolean,
}

export interface SECursorLinks {
  next: string | null;
  previous: string | null;
}

export interface GetSettledEntry extends SECursorLinks {
  results: SettledEntry[];
  running_seed_minor?: number;
  running_seed?: string;
}

export interface EditSettledEntryRequest {
  value_date: string;
}

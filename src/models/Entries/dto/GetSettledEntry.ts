import { SettledEntry } from "../domain/SettledEntry";

/** Query da lista de settlements (root) */
export interface GetSettledEntryRequest {
  page_size?: number;
  cursor?: string;

  // período (datas de valor)
  value_from?: string; // YYYY-MM-DD
  value_to?: string;   // YYYY-MM-DD

  /**
   * ✅ bancos como CSV de external_ids (ex.: "b1,b2,b3")
   * o backend já aceita CSV (e usa para o seed do consolidated balance).
   */
  bank?: string;

  // texto livre e filtros diretos
  q?: string;
  description?: string; // icontains
  observation?: string; // icontains

  // categóricos
  gl?: string;
  project?: string;
  entity?: string;

  tx_type?: number;   // 1 (credit) | -1 (debit)
  amount_min?: number; // minor units (centavos)
  amount_max?: number; // minor units

  include_inactive?: boolean,
}

export interface SECursorLinks {
  next: string | null;
  previous: string | null;
}

export interface GetSettledEntry extends SECursorLinks {
  results: SettledEntry[];
  // (opcionalmente o backend envia:)
  running_seed_minor?: number;
  running_seed?: string;
}

export interface EditSettledEntryRequest {
  value_date: string; // YYYY-MM-DD
}

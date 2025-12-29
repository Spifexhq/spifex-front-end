
// src/models/settings/ledgerAccounts.ts
import type { Paginated } from "@/models/Api";

/* --------------------------------- Read model -------------------------------- */

export interface LedgerAccount {
  id: string;          // external_id from the API
  account: string;
  code?: string;
  category: string;    // human label (API already returns label)
  subcategory?: string;
  default_tx: string;  // read-only (computed in backend)
  is_active: boolean;
}

/* -------------------------------- Query params ------------------------------- */

export interface GetLedgerAccountsRequest {
  active?: "true" | "false";
  category?: string | number;
  q?: string;
  page_size?: number;
  cursor?: string;
}

export type GetLedgerAccountsResponse = Paginated<LedgerAccount>;

/* --------------------------------- Write DTOs -------------------------------- */

export type AddLedgerAccountRequest = {
  account: string;
  code?: string;
  category: 1 | 2 | 3 | 4; // write-time category choice
  subcategory?: string;
  is_active?: boolean;
};

export type EditLedgerAccountRequest = Partial<AddLedgerAccountRequest>;

/* --------------------------------- Bulk DTOs -------------------------------- */

export interface LedgerAccountsBulkRequest {
  ids: string[];
}
export type LedgerAccountsBulkResponse = LedgerAccount[];

/* --------------------------------- Import DTOs ------------------------------- */

export interface ImportLedgerAccountsResponse {
  created_count: number;
  accounts: LedgerAccount[];
}

export interface ImportStandardLedgerAccountsRequest {
  plan: "personal" | "business";
}
export type ImportStandardLedgerAccountsResponse = ImportLedgerAccountsResponse;

/* --------------------------------- Delete DTOs ------------------------------- */

export interface DeleteAllLedgerAccountsRequest {
  confirm_delete_all: true;
}
export interface DeleteAllLedgerAccountsResponse {
  message: string;
  deleted_count: number;
}

export interface LedgerAccountsExistsResponse {
  exists: boolean;
}
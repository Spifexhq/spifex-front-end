// src/models/settings/statements.ts
import type { Paginated } from "@/models/Api";

/* --------------------------------- Read model -------------------------------- */

export type StatementStatus = "uploaded" | "processing" | "ready" | "failed";

export interface StatementListItem {
  id: string;
  bank_account_id: string | null;
  bank_account_label: string | null;

  original_filename: string;
  content_type: string;
  size_bytes: number;
  pages: number | null;

  status: StatementStatus;
  created_at: string; // ISO
  json_ready: boolean;
}

/* -------------------------------- Query params ------------------------------- */

export interface GetStatementsParams {
  q?: string;
  status?: StatementStatus | string;
  bank?: string;
}

export type GetStatementsResponse = Paginated<StatementListItem>;

/* ------------------------------- Upload response ------------------------------ */
/**
 * Keep as unknown unless you want to lock this down to the backend payload.
 * Many APIs return the created Statement object.
 */
export type UploadStatementResponse = unknown;

/* ------------------------------ Analyze response ------------------------------ */

export type AnalyzeStatus = "processing" | "ready" | "failed" | "uploaded";

export interface TriggerStatementAnalysisResponse {
  id: string;
  status: AnalyzeStatus;
  started_at: string;        // ISO
  finished_at: string | null; // ISO or null
  error_message: string;
}

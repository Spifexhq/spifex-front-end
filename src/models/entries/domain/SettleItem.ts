// src/models/entries/domain/SettleItem.ts
import type { Entry } from "@/models/entries/domain";

export interface BulkSettleItem {
  entry_id: string;
  bank_id: string;
  // sempre em minor units para evitar ambiguidades
  amount_minor: number;
  value_date: string;  // YYYY-MM-DD
  settled_on: string;  // YYYY-MM-DD
}

// a resposta pode vir só com updated ou com updated + errors
export type BulkSettleResponse =
  | { updated: Entry[] }
  | { updated: Entry[]; errors: Array<{ id?: string; entry_id?: string; error: string }> };

// src/models/entries/domain/SettleItem.ts
import type { Entry } from "@/models/entries/domain";

export interface BulkSettleItem {
  entry_id: string;
  bank_id: string;
  amount: string;      // ✅ "1234.56" (MAJOR)
  value_date: string;  // YYYY-MM-DD
}

// a resposta pode vir só com updated ou com updated + errors
export type BulkSettleResponse =
  | { updated: Entry[] }
  | { updated: Entry[]; errors: Array<{ id?: string; entry_id?: string; error: string }> };

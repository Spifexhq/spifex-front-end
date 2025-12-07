// models/entries/domain/Entry.ts
// Mirrors EntryReadSerializer

import {
  DepartmentAllocation,
  InventoryAllocation,
} from "@/models/enterprise_structure/domain";

/**
 * Entry coming from EntryReadSerializer
 * - id is the entry external_id (string)
 * - relateds are flat external_ids (strings) instead of nested objects
 * - departments/items are snapshot arrays
 */
export interface Entry {
  id: string;                         // entry.external_id
  due_date: string;                   // YYYY-MM-DD
  description: string;
  observation: string | null;
  notes: string | null;

  amount: string;                     // decimal as string
  tx_type: string;                    // "credit"/"debit" label

  installment_group_id: string | null;
  installment_index: number | null;
  installment_count: number | null;

  interval_months: number;
  weekend_action: number;

  last_settled_on: string | null;       // ISO datetime or null
  settlement_value_date: string | null; // YYYY-MM-DD or null
  is_settled: boolean;

  gl_account: string | null;          // GL external_id
  project: string | null;             // Project external_id
  entity: string | null;              // Entity external_id
  transfer_id: string | null;         // Transfer external_id

  departments: DepartmentAllocation[]; // snapshot list
  items: InventoryAllocation[];        // snapshot list

  running_balance?: string | null;
}

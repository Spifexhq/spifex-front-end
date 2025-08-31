// models/entries/domain/SettledEntry.ts
import { BankAccount } from '../../enterprise_structure/domain/Bank';

export type SettledEntry = {
  /** equals entry.external_id on the backend */
  id: string;

  /** org external id (from entry.organization.external_id) */
  organization: string;

  description: string;
  observation: string | null;
  notes: string | null;

  /** settlement amount as decimal string computed from amount_minor */
  amount: string;

  /**
   * Display label from entry.get_tx_type_display.
   * Backends often return "credit"/"debit" or "Credit"/"Debit". Treat it as free string.
   */
  tx_type: string;

  /** value date of the settlement (YYYY-MM-DD) */
  value_date: string;

  /** when the settlement was created (YYYY-MM-DD) */
  settled_on: string;

  /** sequential index for partial settlements; null for the final/full one */
  partial_index: number | null;

  // Entry-facing fields mirrored on the settlement row
  document_type: string | null;
  installment_group_id: string | null;
  installment_index: number | null;
  installment_count: number | null;
  interval_months: number;
  weekend_action: number;

  /** related by external_id (strings) */
  gl_account: string | null;
  project: string | null;
  entity: string | null;
  transfer_id: string | null;

  /** denormalized slices from entry prefetch */
  departments: Array<{
    department_id: string | null;
    code: string;
    name: string;
    percent: string;        // "100.00"
  }>;
  items: Array<{
    item_id: string | null;
    sku: string;
    name: string;
    quantity: string;       // "1.000"
  }>;

  /** settlement identifiers */
  external_id: string;   // settlement external_id
  entry_id: string;      // same as id (entry external_id)
  bank: BankAccount | null;
};

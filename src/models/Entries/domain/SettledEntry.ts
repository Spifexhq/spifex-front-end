import { BankAccount } from "../../enterprise_structure/domain/Bank";

/**
 * Row retornada por SettlementReadSerializer.
 * Observação: agora inclui os campos de saldo corrido vindos do backend.
 */
export type SettledEntry = {
  /** entry.external_id (id lógico do lançamento) */
  id: string;
  organization: string;

  description: string;
  observation: string | null;
  notes: string | null;

  /** decimal string derivada de amount_minor no serializer */
  amount: string;
  /** rótulo livre, ex.: "credit" | "debit" */
  tx_type: string;

  /** datas da liquidação */
  value_date: string;     // YYYY-MM-DD
  settled_on: string;     // ISO datetime
  partial_index: number | null;

  /** metadados do entry “espelhados” na liquidação */
  document_type: string | null;
  installment_group_id: string | null;
  installment_index: number | null;
  installment_count: number | null;
  interval_months: number;
  weekend_action: number;

  gl_account: string | null;
  project: string | null;
  entity: string | null;
  transfer_id: string | null;

  departments: Array<{
    department_id: string | null;
    code: string;
    name: string;
    percent: string; // "100.00"
  }>;
  items: Array<{
    item_id: string | null;
    sku: string;
    name: string;
    quantity: string; // "1.000"
  }>;

  /** identificadores da liquidação */
  external_id: string; // settlement.external_id
  entry_id: string;    // entry.external_id
  bank: BankAccount | null;

  /** ✅ novo: saldo vindo do backend */
  running_balance?: string | null;
};

import { BankAccount } from "../../enterprise_structure/domain/Bank";

export type SettledEntry = {
  id: string;
  organization: string;

  description: string;
  observation: string | null;
  notes: string | null;

  amount: string;
  tx_type: string;

  value_date: string;
  settled_on: string;
  partial_index: number | null;

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
    percent: string;
  }>;
  items: Array<{
    item_id: string | null;
    sku: string;
    name: string;
    quantity: string;
  }>;

  external_id: string;
  entry_id: string;
  bank: BankAccount | null;

  running_balance?: string | null;
};

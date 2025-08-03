import {
  GeneralLedgerAccount, DocumentType,
  DepartmentAllocation, Project,
  InventoryAllocation, Entity
} from '@/models/ForeignKeys';
import { Bank } from '../Bank';

export interface Entry {
  id: number;
  due_date: string;
  description: string;
  observation: string | null;
  amount: string;
  current_installment: number | null;
  total_installments: number | null;
  tags: string | null;
  transaction_type: "credit" | "debit";
  notes: string | null;
  periods: string | null;
  weekend_action: string | null;
  creation_date: string;
  general_ledger_account: GeneralLedgerAccount | null;
  document_type: DocumentType | null;
  departments: DepartmentAllocation[] | null;
  project: Project | null;
  inventory_item: InventoryAllocation[] | null;
  entity: Entity | null;

  bank?: Bank | null;
  settlement_due_date?: string | null;
  installments_correlation_id?: string | null;
  partial_settlement_correlation_id?: string | null;

  settlement_state: 0 | 1;
  enterprise: number;
};

export interface CursorLinks {
  next: string | null;
  previous: string | null;
}

export interface GetEntry extends CursorLinks {
  results: Entry[];
}

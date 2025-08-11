import {
  LedgerAccount, DocumentType,
  DepartmentAllocation, Project,
  InventoryAllocation, Entity
} from '@/models/enterprise_structure/domain';
import { Bank } from '../../enterprise_structure/domain/Bank';

export type SettledEntry = {
  id: number;
  description: string;
  observation: string | null;
  amount: string;
  current_installment: number | null;
  total_installments: number | null;
  tags: string | null;
  transaction_type: string;
  notes: string | null;
  periods: string | null;
  weekend_action: string | null;
  creation_date: string;
  general_ledger_account: LedgerAccount | null;
  document_type: DocumentType | null;
  departments: DepartmentAllocation[];
  project: Project[] | null;
  inventory: InventoryAllocation[] | null;
  entity: Entity[] | null;

  bank: Bank;
  settlement_due_date: string;
  installments_correlation_id?: string | null;
  partial_settlement_correlation_id?: string | null;
  transference_correlation_id?: string | null;
  settlement_state: boolean;
  settlement_date: string;
  enterprise: number;
};

import { GeneralLedgerAccount } from './GeneralLedgerAccount';
import { DocumentType } from './DocumentType';
import { Project } from './Project';
import { Inventory } from './Inventory';
import { Entity } from './Entity';
import { Department } from './Department';
import { Bank } from './Bank';

export interface TableEntry {
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
  installments_correlation_id: string | null;
  partial_settlement_correlation_id: string | null;
  settlement_state: boolean;
  general_ledger_account: GeneralLedgerAccount[] | null;
  document_type: DocumentType[] | null;
  departments?: Department[] | null;
  project: Project[] | null;
  inventory_item?: Inventory[] | null;
  entity: Entity[] | null;
  settlement_due_date?: string;
  due_date?: string;
  bank: Bank;
  display_date: string;
  balance?: number;
  extraFields?: Record<string, unknown>; // Substitui o [key: string]: any;
}


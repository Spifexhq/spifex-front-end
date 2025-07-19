import { IApiResponse } from '@/models/Api';
import {
  GeneralLedgerAccount, DocumentType,
  DepartmentAllocation, Project,
  InventoryAllocation, Entity
} from '@/models/ForeignKeys';
import { Bank } from '../Bank';

export type Entry = {
  id: number;
  due_date: string;
  formatted_due_date: string;
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
  general_ledger_account: GeneralLedgerAccount | null;
  document_type: DocumentType | null;
  departments: DepartmentAllocation[] | null;
  project: Project | null;
  inventory_item: InventoryAllocation[] | null;
  entity: Entity | null;

  bank?: Bank;
  settlement_due_date?: string;
  installments_correlation_id?: string | null;
  partial_settlement_correlation_id?: string | null;
  settlement_state: boolean;
  enterprise: number;
};

export interface ApiGetEntriesData {
  entries: Entry[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface ApiGetEntryData {
  entries: Entry[];
}

export type ApiGetEntriesResponse = IApiResponse<ApiGetEntriesData>;
export type ApiGetEntryResponse = IApiResponse<ApiGetEntryData>;

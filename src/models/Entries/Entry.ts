import { GeneralLedgerAccount } from '../GeneralLedgerAccount';
import { DocumentType } from '../DocumentType';
import { Department } from '../Department';
import { Project } from '../Project';
import { Inventory } from '../Inventory';
import { Entity } from '../Entity';
import { Bank } from '../Bank';

export type Entry = {
  id: number;
  due_date: string;
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
  departments: Department[];
  project: Project | null;
  inventory_item: Inventory[];
  entity: Entity | null;

  bank?: Bank;
  settlement_due_date?: string;
  installments_correlation_id?: string | null;
  partial_settlement_correlation_id?: string | null;
  settlement_state: boolean;
  enterprise: number;
};

// Entries
export type ApiGetEntriesSuccess = {
  entries: Entry[];
};

export type ApiGetEntriesError = {
  detail: string;
};

export type ApiGetEntriesResponse = ApiGetEntriesSuccess | ApiGetEntriesError;

// Entry
export type ApiGetEntrySuccess = {
  entry: Entry;
};

export type ApiGetEntryError = {
  detail: string;
};

export type ApiGetEntryResponse = ApiGetEntrySuccess | ApiGetEntryError;

export type CashFlowFilters = {
  startDate?: string;
  endDate?: string;
  description?: string;
  observation?: string;
  generalLedgerAccountId?: number[];
};
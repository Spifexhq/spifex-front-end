import { GeneralLedgerAccount } from '../GeneralLedgerAccount';
import { DocumentType } from '../DocumentType';
import { Department } from '../Department';
import { Project } from '../Project';
import { Inventory } from '../Inventory';
import { Entity } from '../Entity';
import { Bank } from '../Bank';

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
  general_ledger_account: GeneralLedgerAccount | null;
  document_type: DocumentType[] | null;
  departments: Department[];
  project: Project[] | null;
  inventory: Inventory[] | null;
  entity: Entity[] | null;

  bank: Bank;
  settlement_due_date: string;
  installments_correlation_id?: string | null;
  partial_settlement_correlation_id?: string | null;
  transference_correlation_id?: string | null;
  settlement_state: boolean;
  enterprise: number;
};

// Settled Entries
export type ApiGetSettledEntriesSuccess = {
  settled_entries: SettledEntry[];
};

export type ApiGetSettledEntriesError = {
  detail: string;
};

export type ApiGetSettledEntriesResponse = ApiGetSettledEntriesSuccess | ApiGetSettledEntriesError;

// Settled Entry
export type ApiGetSettledEntrySuccess = {
  entry: SettledEntry;
};

export type ApiGetSettledEntryError = {
  detail: string;
};

export type ApiGetSettledEntryResponse = ApiGetSettledEntrySuccess | ApiGetSettledEntryError;

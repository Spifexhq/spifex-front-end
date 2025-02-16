export type EntryPayloadBase = {
  due_date: string;
  description?: string;
  observation?: string;
  amount: string;
  current_installment: number;
  total_installments: number;
  tags?: string;
  transaction_type?: string;
  notes?: string;
  periods?: string;
  weekend_action?: string;
  general_ledger_account_id?: string;
  document_type_id?: string;
  project_id?: string;
  entity_id?: string;
  inventory_item_id?: string;
  inventory_item_quantity?: number;
  department_id?: string;
  department_percentage?: string;
};

export type AddEntryPayload = EntryPayloadBase;

export type EditEntryPayload = Partial<EntryPayloadBase>;

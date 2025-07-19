export type EntryPayloadBase = {
  due_date: string;
  description?: string;
  observation?: string | null;
  amount: string;
  current_installment: number | null;
  total_installments: number | null;
  tags?: string | null;
  transaction_type?: string;
  notes?: string | null;
  periods?: string | null;
  weekend_action?: string | null;
  general_ledger_account_id?: string | null;
  document_type_id?: string | null;
  project_id?: string | null;
  entity_id?: string | null;
  department_id?: string | null;
  department_percentage?: string | null;
  inventory_item_id?: number | null;
  inventory_item_quantity?: number | null;
};

export type AddEntryPayload = EntryPayloadBase;

export type EditEntryPayload = Partial<EntryPayloadBase>;

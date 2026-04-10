export type CashflowCategory = {
  id: string;
  parent_id: string | null;
  parent_label?: string | null;
  code: string;
  name: string;
  description: string;
  tx_type_hint: "credit" | "debit" | null;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
  entry_count?: number;
};

export type GetCashflowCategoriesParams = {
  include_inactive?: boolean;
  search?: string;
  parent_id?: string;
  tx_type_hint?: "credit" | "debit";
  active?: "true" | "false";
};

export type GetCashflowCategoriesResponse = CashflowCategory[];

export type AddCashflowCategoryRequest = {
  code?: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  tx_type_hint?: "credit" | "debit" | null;
  is_active?: boolean;
  sort_order?: number;
  metadata?: Record<string, unknown>;
};

export type EditCashflowCategoryRequest = Partial<AddCashflowCategoryRequest>;

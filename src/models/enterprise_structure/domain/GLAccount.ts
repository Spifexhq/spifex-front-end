// models/enterprise_structure/domain/GLAccounts
export interface GLAccount {
  id: string;        // external_id from the API
  account: string;
  code?: string;
  category: string;  // human label (API already returns label)
  subcategory?: string;
  default_tx: string; // read-only (computed in backend)
  is_active: boolean;
}

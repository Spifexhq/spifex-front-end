// models/enterprise_structure/domain/Entity.ts
export interface Entity {
  id: string;        // external_id from the API
  full_name: string | null;
  alias_name: string | null;
  entity_type: string | null; // "client" | "supplier" | "employee" | ...
  is_active: boolean;

  ssn_tax_id: string | null;
  ein_tax_id: string | null;
  email: string | null;
  phone: string | null;

  street: string | null;
  street_number: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;

  bank_name: string | null;
  bank_branch: string | null;
  checking_account: string | null;
  account_holder_tax_id: string | null;
  account_holder_name: string | null;
}

export interface EntityType {
  id: number;
  entity_type: string;
}

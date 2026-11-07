export type ProductCategory = "business" | "personal";
export type WorkspaceLifecycle = "active" | "legacy" | "deletion_pending" | "deleted";
export interface ProductWorkspaceFields { product_category?: ProductCategory; lifecycle?: WorkspaceLifecycle; legacy_since?: string | null; scheduled_deletion_at?: string | null; replacement_workspace_id?: string | null; selected_plan_code?: string | null; }

// src/models/auth/organization.ts

export interface Owner {
  name: string;
  email: string;
}

export type OrgLedgerMode = "personal" | "organizational";

export interface OrgLedgerProfile {
  mode: OrgLedgerMode;
  default_template?: string | null;
  language_code?: string | null;
  use_compact_cashflow_view: boolean;
  auto_bootstrapped_at?: string | null;
}

export interface Organization extends ProductWorkspaceFields {
  id: string;
  name: string;
  timezone?: string;
  line1?: string | null;
  line2?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  owner: Owner;

  currency?: string | null;
  ledger_profile?: OrgLedgerProfile | null;
}

export interface OrganizationSummary extends ProductWorkspaceFields {
  id: string;
  name: string;
  currency: string;
  ledger_mode?: OrgLedgerMode | null;
}

/* ----------------------------- Org Currency types ---------------------------- */

export interface OrgCurrencyResponse {
  currency: string | null;
}

export interface UpdateOrgCurrencyRequest {
  currency: string;
  current_password: string;
}

/* --------------------------- Org Ledger Profile types ------------------------ */

export interface OrgLedgerProfileResponse {
  mode: OrgLedgerMode;
  default_template?: string | null;
  language_code?: string | null;
  use_compact_cashflow_view: boolean;
  auto_bootstrapped_at?: string | null;
}

export interface UpdateOrgLedgerProfileRequest {
  mode?: OrgLedgerMode;
  default_template?: string;
  language_code?: string;
  use_compact_cashflow_view?: boolean;
  current_password: string;
}
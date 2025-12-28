// src/models/auth/organization.ts

export interface Owner {
  name: string;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  timezone?: string;
  line1?: string | null;
  line2?: string | null;
  country?: string | null;
  city?: string | null;
  postal_code?: string | null;
  owner: Owner;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  currency: string;
}

/* ----------------------------- Org Currency types ---------------------------- */

export interface OrgCurrencyResponse {
  currency: string | null;
}

export interface UpdateOrgCurrencyRequest {
  currency: string;
  current_password: string;
}

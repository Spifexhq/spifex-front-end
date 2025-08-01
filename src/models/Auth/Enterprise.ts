// @/models/auth/Enterprise.ts

export type Owner = {
  name: string;
  email: string;
};

export type Enterprise = {
  id: number;
  external_id: string;
  name: string;
  enterprise_timezone: string;
  address_line1?: string | null;
  address_line2?: string | null;
  country?: string | null;
  city?: string | null;
  zip_code?: string | null;
  owner: Owner;
};

export type ApiGetEnterprise = {
  enterprise: Enterprise;
};

// models/auth/Enterprise.ts
export interface Owner {
  name: string;
  email: string;
}

export interface Organization {
  id: number;
  external_id: string;
  name: string;
  timezone?: string;
  line1?: string | null;
  line2?: string | null;
  country?: string | null;
  city?: string | null;
  postal_code?: string | null;
  owner: Owner;
}

export interface Owner {
  name: string;
  email: string;
}

export interface Enterprise {
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
}

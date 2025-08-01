export interface Owner {
  name: string;
  email: string;
}

export interface Enterprise {
  id: number;
  externalId: string;
  name: string;
  enterpriseTimezone: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  country?: string | null;
  city?: string | null;
  zipCode?: string | null;
  owner: Owner;
}

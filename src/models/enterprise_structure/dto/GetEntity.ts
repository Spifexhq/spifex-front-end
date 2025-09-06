// models/enterprise_structure/dto/GetEntity.ts
import { Entity } from "../domain/Entity";

export interface GetEntitiesResponse {
  results: Entity[];
  next?: string | null;
  previous?: string | null;
  count?: number;
}

export type GetEntityResponse = Entity;

export type EntityPayloadBase = {
  full_name?: string | null;
  alias_name?: string | null;
  entity_type?: string | null;
  is_active?: boolean;

  ssn_tax_id?: string | null;
  ein_tax_id?: string | null;
  email?: string | null;
  phone?: string | null;

  street?: string | null;
  street_number?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;

  bank_name?: string | null;
  bank_branch?: string | null;
  checking_account?: string | null;
  account_holder_tax_id?: string | null;
  account_holder_name?: string | null;
};

export type AddEntityRequest = EntityPayloadBase;
export type EditEntityRequest = Partial<EntityPayloadBase>;

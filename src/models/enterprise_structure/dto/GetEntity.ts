import { Entity } from "../domain/Entity";

export interface GetEntities {
  entities: Entity[];
}

export interface GetEntity {
  entity: Entity;
}

export interface EntityPayloadBase {
  full_name: string | null;
  ssn_tax_id: string | null;
  ein_tax_id: string | null;
  alias_name: string | null;
  area_code: string | null;
  phone_number: string | null;
  street: string | null;
  street_number: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  email: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  checking_account: string | null;
  account_holder_tax_id: string | null;
  account_holder_name: string | null;
  entity_type: string | null;
}

export type AddEntityRequest = EntityPayloadBase;
export type EditEntityRequest = EntityPayloadBase;

// src/models/settings/entities.ts
import type { Paginated } from "@/models/Api";

/* --------------------------------- Read model -------------------------------- */

export interface Entity {
  id: string; // external_id from the API
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

/* -------------------------------- Query params ------------------------------- */

export interface GetEntitiesParams {
  cursor?: string;
  active?: "true" | "false";
  type?: string; // client | supplier | employee ...
  q?: string;
}

/**
 * Use shared Paginated model; count is intentionally discarded.
 */
export type GetEntitiesResponse = Paginated<Entity>;

export type GetEntityResponse = Entity;

/* --------------------------------- Write DTOs -------------------------------- */

export interface EntityPayloadBase {
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
}

export type AddEntityRequest = EntityPayloadBase;
export type EditEntityRequest = Partial<EntityPayloadBase>;

/* --------------------------------- Bulk DTOs -------------------------------- */

export interface EntitiesBulkRequest {
  ids: string[];
}
export type EntitiesBulkResponse = Entity[];

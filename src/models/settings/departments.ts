// src/models/settings/departments.ts
import type { Paginated } from "@/models/Api";

/* --------------------------------- Read model -------------------------------- */

export interface Department {
  id: string; // external_id from the API
  name: string;
  code?: string;
  is_active: boolean;
}

export interface DepartmentAllocation {
  department_id: string | null;
  code: string;
  name: string;
  percent: string;
}

/* -------------------------------- Query params ------------------------------- */

export interface GetDepartmentsParams {
  cursor?: string;

  /**
   * Legacy broad query (kept for backward compatibility).
   * Backend supports q -> OR across code/name (and now code/name separated too).
   */
  q?: string;

  /** New separated filters */
  code?: string;
  name?: string;

  /** Status filter (string form expected by backend parse_bool) */
  active?: "true" | "false";
}

/**
 * Use shared Paginated model; count is intentionally discarded.
 */
export type GetDepartmentsResponse = Paginated<Department>;

export type GetDepartmentResponse = Department;

/* --------------------------------- Write DTOs -------------------------------- */

export interface DepartmentPayloadBase {
  name: string;
  code?: string;
  is_active?: boolean;
}

export type AddDepartmentRequest = DepartmentPayloadBase;
export type EditDepartmentRequest = DepartmentPayloadBase;

/* --------------------------------- Bulk DTOs -------------------------------- */

export interface DepartmentsBulkRequest {
  ids: string[];
}
export type DepartmentsBulkResponse = Department[];

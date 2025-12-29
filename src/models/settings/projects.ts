// src/models/settings/projects.ts
import type { Paginated } from "@/models/Api";

/* --------------------------------- Read model -------------------------------- */

export interface Project {
  id: string;        // external_id from the API
  name: string;
  code: string;
  type: string;
  description: string;
  is_active: boolean;
}

/* -------------------------------- Query params ------------------------------- */

export interface GetProjectsParams {
  cursor?: string;
  active?: "true" | "false";
  type?: string;
  q?: string;
}

/**
 * Use shared Paginated model; count is intentionally discarded.
 */
export type GetProjectsResponse = Paginated<Project>;

/* --------------------------------- Write DTOs -------------------------------- */

export interface AddProjectRequest {
  name: string;
  code?: string;
  type: string;
  description?: string;
  is_active?: boolean;
}

export type EditProjectRequest = Partial<AddProjectRequest>;

/* --------------------------------- Bulk DTOs -------------------------------- */

export interface ProjectsBulkRequest {
  ids: string[];
}
export type ProjectsBulkResponse = Project[];

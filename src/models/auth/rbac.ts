// src/models/auth/rbac.ts

/* -------------------------------- Permissions -------------------------------- */

export interface Permission {
  code: string;
  name: string;
  description?: string;
  category?: string;
}

export interface GetPermissionsResponse {
  permissions: Permission[];
}

export interface GetPermissionResponse {
  permission: Permission;
}

/**
 * Keeping these because you had them already, even if not used in the shown API calls yet.
 */
export interface PermissionPayloadBase {
  name: string;
  code_name: string;
  permission_type: string;
  usage_limit: Record<string, number | null>;
}

export type AddPermissionRequest = PermissionPayloadBase;
export type EditPermissionRequest = PermissionPayloadBase;

/* ---------------------------------- Groups ---------------------------------- */

export interface GroupListItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions_count: number;
  members_count: number;
  created_by_email?: string;
  created_at: string; // ISO
}

export interface GroupDetail {
  id: string;
  slug: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Permission[];
  created_by_email?: string;
  created_at: string; // ISO
}

export interface GetGroupsResponse {
  results: GroupListItem[];
  next?: string | null;
  previous?: string | null;
  count?: number;
}

export type GetGroupResponse = GroupDetail;

export interface GroupPayloadBase {
  name: string;
  description?: string;
  is_system?: boolean;
  permission_codes?: string[];
}

export type AddGroupRequest = GroupPayloadBase;
export type EditGroupRequest = GroupPayloadBase;

/* --------------------------- Group permissions view --------------------------- */

export interface GroupPermissionsGroupRef {
  external_id: string;
  name: string;
  slug: string;
}

export interface GetGroupPermissionsResponse {
  group: GroupPermissionsGroupRef;
  permissions: Permission[];
}

export interface UpdateGroupPermissionsRequest {
  permission_codes: string[];
}

export interface UpdateGroupPermissionsResponse {
  message: string;
  permissions: string[];
}

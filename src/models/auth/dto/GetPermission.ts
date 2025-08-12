import { Permission } from "../domain";

export interface GetPermissions {
  permissions: Permission[];
}

export interface GetPermission {
  permission: Permission;
}

export interface PermissionPayloadBase {
  name: string;
  code_name: string;
  permission_type: string;
  usage_limit: Record<string, number | null>;
}

export type AddPermissionRequest = PermissionPayloadBase;
export type EditPermissionRequest = PermissionPayloadBase;

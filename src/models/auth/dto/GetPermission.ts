import { Permission } from "../domain";

export interface GetPermissionsResponse {
  permissions: Permission[];
}

export interface GetPermissionResponse {
  permissions: Permission;
}

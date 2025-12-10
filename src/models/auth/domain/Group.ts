// models/auth/domain/Group.ts
import { Permission } from "./Permission";

export interface GroupListItem {
  external_id: string;
  slug: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions_count: number;
  members_count: number;
  created_by_email?: string;
  created_at: string;
}

export interface GroupDetail {
  external_id: string;
  slug: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Permission[];
  created_by_email?: string;
  created_at: string;
}

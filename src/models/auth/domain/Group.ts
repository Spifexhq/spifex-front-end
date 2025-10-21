// models/auth/domain/Group.ts
import { Permission } from "./Permission";

export interface GroupListItem {
  id: number;
  external_id: string;
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
  id: number;
  external_id: string;
  slug: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Permission[];
  // opcional: members se você usar o detail completo
  // members?: Array<{ user_id: number; email: string; first_name?: string; last_name?: string; }>;
  created_by_email?: string;
  created_at: string; // ISO
}

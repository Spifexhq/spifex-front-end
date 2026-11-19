// src/models/auth/members.ts
import type { GroupListItem } from "./rbac";

export type Role = "owner" | "admin" | "member";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string; // ISO
  updated_at: string; // ISO
  groups: GroupListItem[];
}

export interface GetMembersParams {
  name?: string;
  email?: string;
  role?: Role;      // backend accepts owner/admin/member (UI will typically exclude owner)
  group?: string;   // group slug (single)
}

export interface GetMembersResponse {
  members: Member[];
}

export interface GetMemberResponse {
  member: Member;
}

export interface EffectiveAccessGroup {
  id: string;
  slug: string;
  name: string;
  is_system: boolean;
  permission_codes: string[];
}

export interface EffectiveAccess {
  member: {
    id: string;
    name: string;
    email: string;
    role: Role;
    is_owner: boolean;
  };
  groups: EffectiveAccessGroup[];
  assigned_codes: string[];
  effective_codes: string[];
  inactive_assigned_codes: string[];
  group_sources: Record<string, string[]>;
  plan: {
    code: string | null;
    unavailable_codes: string[];
  };
  dependencies: Record<string, string[]>;
  missing_dependencies: Record<string, string[]>;
  owner_only_capabilities: Array<{ code: string; name: string }>;
  protected_operations: Array<{ code: string; owner_only: boolean }>;
  lifecycle: string;
  warnings: string[];
}

export type AddMemberRequest = {
  name?: string;
  email: string;
  password?: string;
  role?: Exclude<Role, "owner">;
  group_ids?: string[];
  group_slugs?: string[];
};

export type EditMemberRequest = Partial<Omit<AddMemberRequest, "password">>;

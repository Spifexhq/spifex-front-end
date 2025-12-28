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

export interface GetMembersResponse {
  members: Member[];
}

export interface GetMemberResponse {
  member: Member;
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

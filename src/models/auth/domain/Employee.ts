// src/models/auth/domain/Employee
import { GroupListItem as Group } from "./Group";

export type Role = "owner" | "admin" | "member";

export interface Employee {
  id: number;      // membership id
  name: string;
  email: string;
  role: Role;
  created_at: string;
  updated_at: string;
  groups: Group[];
}

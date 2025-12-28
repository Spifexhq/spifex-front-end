// src/models/auth/user.ts
import type { OrganizationSummary } from "./organization";

export interface User {
  name: string;
  email: string;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_email_verified: boolean;
  date_joined: string;
  verified_at: string;
  last_password_change: string | null;
}

export interface UserOrganizationDetail {
  is_owner: boolean;
  role: string | null;
  organization: OrganizationSummary | null;
}

export interface PersonalSettings {
  name: string;
  email: string;
  phone?: string;
  job_title?: string;
  department?: string;
  timezone: string;
  country?: string;
}

export type EditPersonalSettingsRequest = Partial<Omit<PersonalSettings, "email">>;

export interface GetUserResponse {
  user: User;
  organization: UserOrganizationDetail;
  is_subscribed: boolean;
  permissions: string[];
}

// src/models/auth/user.ts
import type { OrganizationSummary } from "./organization";

export interface User {
  id: string;
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
  // core
  name: string;
  email: string;

  // work/contact
  phone?: string;
  job_title?: string;
  department?: string;

  // regional
  timezone: string;
  country?: string; // ISO-3166 alpha-2

  // address (like OrganizationSettings)
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;

  // sensitive personal data
  national_id?: string;
  birth_date?: string | null; // "YYYY-MM-DD" or null
  gender?: string;
  note?: string;
}

export type EditPersonalSettingsRequest = Partial<Omit<PersonalSettings, "email">>;

export interface GetUserResponse {
  user: User;
  organization: UserOrganizationDetail;
  is_subscribed: boolean;
  permissions: string[];
}

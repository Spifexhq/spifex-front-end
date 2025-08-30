// models/auth/User.ts
export interface User {
  id: number;
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
  organization: {
    id: number;
    external_id: string;
    name: string;
  } | null;
  permissions?: string[];
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
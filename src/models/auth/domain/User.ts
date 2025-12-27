// models/auth/User.ts
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
  organization: {
    external_id: string;
    name: string;
    currency: string;
  } | null;
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
import { Permission } from "./Permission";

export interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  job_title: string;
  department: string;
  user_timezone : string;
  user_country: string;
  is_owner: boolean;
  is_superuser: boolean;
  stripe_customer_id: string | null;
  is_subscribed: boolean;
  is_active: boolean;
  is_staff: boolean;
  is_email_verified: boolean;
  date_joined: string;
  last_password_change: string | null;
}

export interface UserEnterpriseDetail {
  is_owner: boolean;
  permissions: Permission[];
}

import { Permission } from './Permission';

export type User = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  job_title: string;
  department: string;
  is_owner: boolean;
  is_superuser: boolean;
  stripe_customer_id: string | null;
  is_subscribed: boolean;
  is_active: boolean;
  is_staff: boolean;
  is_email_verified: boolean;
  date_joined: string;
};

export type UserEnterpriseDetail = {
  is_owner: boolean;
  permissions: Permission[];
};

export type Subscription = {
  status: string;
  stripe_subscription_id: string;
  plan_id: string;
};

export type ApiGetUser = {
  user: User;
  enterprise: UserEnterpriseDetail;
  subscription: Subscription | null;
};

export type ApiSignIn = {
  user: User;
  enterprise: UserEnterpriseDetail;
  subscription: Subscription | null;
  refresh: string;
  access: string;
};

export type ApiSignUp = {
  name: string;
  email: string;
  password: string;
};

export type ApiSubscriptionStatus = {
  is_subscribed: boolean;
  active_plan_id: string | null;
};

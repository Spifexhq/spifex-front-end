// src/features/auth/types.ts

/* ============================================================================
 * Primitive aliases / shared helpers
 * ========================================================================== */

export type UserId = number;
export type OrganizationId = number;
export type SubscriptionId = number;
export type GroupId = number;
export type CounterUsageId = number;

export type ISODateString = string;      // "2025-11-17"
export type ISODateTimeString = string;  // "2025-11-17T12:34:56Z"

export type LanguageCode = "en" | "pt" | "fr" | "de";
export type CurrencyCode = "BRL" | "USD" | "EUR";

/* ============================================================================
 * User / Account
 * ========================================================================== */

export interface User {
  id: UserId;
  name: string;
  email: string;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_email_verified: boolean;
  date_joined: ISODateTimeString;
  verified_at: ISODateTimeString;
  last_password_change: ISODateTimeString | null;
}

export interface UserOrganizationDetail {
  is_owner: boolean;
  role: string | null;
  organization: {
    id: OrganizationId;
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

export interface VerifyEmailResponse {
  enterprise_id: number;
  novo_email: string;
}

export interface VerifyNewEmailResponse {
  enterprise_id: number;
  novo_email: string;
}

/* ============================================================================
 * Enterprise / Organization
 * ========================================================================== */

export interface Owner {
  name: string;
  email: string;
}

export interface Organization {
  id: OrganizationId;
  external_id: string;
  name: string;
  timezone?: string;
  line1?: string | null;
  line2?: string | null;
  country?: string | null;
  city?: string | null;
  postal_code?: string | null;
  owner: Owner;
}

/* ============================================================================
 * Permissions & Groups
 * ========================================================================== */

export interface Permission {
  code: string;
  name: string;
  description?: string;
  category?: string;
}

export interface GroupListItem {
  id: GroupId;
  external_id: string;
  slug: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions_count: number;
  members_count: number;
  created_by_email?: string;
  created_at: ISODateTimeString; // ISO
}

export interface GroupDetail {
  id: GroupId;
  external_id: string;
  slug: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Permission[];
  // optional: members if you use the full detail
  // members?: Array<{ user_id: number; email: string; first_name?: string; last_name?: string; }>;
  created_by_email?: string;
  created_at: ISODateTimeString; // ISO
}

/* ============================================================================
 * Employees
 * ========================================================================== */

export type Role = "owner" | "admin" | "member";

export interface Employee {
  external_id: string;
  name: string;
  email: string;
  role: Role;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
  groups: GroupListItem[];
}

/* ============================================================================
 * Subscription / Billing
 * ========================================================================== */

export interface SubscriptionPlanLite {
  code: string | null;
  name: string | null;
  description: string | null;
}

export interface SubscriptionCustomer {
  id: number;
  stripe_customer_id: string;
  default_payment_method_id: string | null;
  created_at: ISODateTimeString;
}

export interface Subscription {
  id: SubscriptionId;
  organization_id: OrganizationId;
  stripe_subscription_id: string;
  status: string;
  plan_price_id: string;
  plan_product_id: string | null;
  plan_nickname: string | null;
  current_period_start: ISODateTimeString;
  current_period_end: ISODateTimeString;
  cancel_at_period_end: boolean;
  is_active: boolean;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
  plan: SubscriptionPlanLite | null;
  customer: SubscriptionCustomer | null;
}

/* ============================================================================
 * Counters / Usage
 * ========================================================================== */

export interface CounterUsage {
  id: CounterUsageId;
  user_id: UserId;
  permission: Permission;
  counter: number;
  checkpoint_usage: string;
}

export interface IncrementCounterUsage {
  counter_usage: CounterUsage;
  message: string;
}

/* ============================================================================
 * Entitlements / Limits
 * ========================================================================== */

export type EntitlementPeriod = "daily" | "monthly" | "lifetime";

export type PermissionLite = {
  code: string;
  name: string | null;
  category: string | null;
  description: string | null;
};

export type PlanLite = {
  code: string;
  name: string;
};

export type EntitlementLimits = {
  unmetered: boolean;
  limit: number | null;
  period: EntitlementPeriod;
  enforce: boolean;
};

export type EntitlementUsage = {
  used: number;
  remaining: number | null;
  window_start: ISODateTimeString | null; // ISO
  window_end: ISODateTimeString | null;   // ISO
  resets_at: ISODateTimeString | null;    // ISO
  server_time: ISODateTimeString;         // ISO
};

export type EntitlementLimitItem = {
  permission: PermissionLite;
  plan: PlanLite;
  limits: EntitlementLimits;
  usage: EntitlementUsage;
};

/* ============================================================================
 * Notifications
 * ========================================================================== */

export type NotificationCategory =
  | "security"
  | "billing"
  | "product_updates"
  | "newsletter"
  | "marketing"
  | "reminders";

export type NotificationChannel = "email"; // for now

export interface NotificationPreference {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

/* ============================================================================
 * API DTOs – Organization
 * ========================================================================== */

export interface GetOrganizationResponse {
  organization: Organization;
}

/* ============================================================================
 * API DTOs – Permissions / Groups
 * ========================================================================== */

export type GetGroups = GroupListItem[] | { results: GroupListItem[] };
export type GetGroup = GroupDetail;

export interface GroupPayloadBase {
  name: string;
  description?: string;
  is_system?: boolean;
  permission_codes?: string[];
}

export type AddGroupRequest = GroupPayloadBase;
export type EditGroupRequest = GroupPayloadBase;

export interface GetPermissions {
  permissions: Permission[];
}

export interface GetPermission {
  permission: Permission;
}

export interface PermissionPayloadBase {
  name: string;
  code_name: string;
  permission_type: string;
  usage_limit: Record<string, number | null>;
}

export type AddPermissionRequest = PermissionPayloadBase;
export type EditPermissionRequest = PermissionPayloadBase;

/* ============================================================================
 * API DTOs – Employees
 * ========================================================================== */

export interface GetEmployeesResponse {
  employees: Employee[];
}

export interface GetEmployeeResponse {
  employee: Employee;
}

export type AddEmployeeRequest = {
  name?: string;
  email: string;
  password?: string;
  role?: Exclude<Role, "owner">;
  group_external_ids?: string[];
  group_ids?: number[];
  group_slugs?: string[];
};

export type EditEmployeeRequest = Partial<Omit<AddEmployeeRequest, "password">>;

/* ============================================================================
 * API DTOs – Counters / Entitlements
 * ========================================================================== */

export interface GetCounterUsage {
  counter_usage?: CounterUsage[];
}

export interface GetEntitlementLimitsResponse {
  plan: PlanLite;
  items: EntitlementLimitItem[];
}

/* ============================================================================
 * API DTOs – Subscription / Billing
 * ========================================================================== */

export interface GetSubscriptionStatusResponse {
  is_subscribed: boolean;
  subscription: Subscription | null;
}

// Backwards-compatible name if you already use SubscriptionDTO
export type SubscriptionDTO = GetSubscriptionStatusResponse;

/* ============================================================================
 * API DTOs – Auth / User
 * ========================================================================== */

export interface GetUserResponse {
  user: User;
  organization: UserOrganizationDetail;
  subscription: GetSubscriptionStatusResponse | null;
  permissions: string[];
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: User;
  organization: UserOrganizationDetail;
  subscription: GetSubscriptionStatusResponse | null;
  permissions: string[];
  refresh: string;
  access: string;
}

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  timezone: string;
  country: string;
  language?: LanguageCode;
  currency?: CurrencyCode;
  browser_language?: string;
  browser_languages?: string[];
  locale?: string;
  consents?: {
    privacy_policy: boolean;
    terms_of_service: boolean;
    marketing?: boolean;
  };
}

export interface SignUpResponseSuccess {
  status: "success";
  message: string;
  data: {
    user: User;
    organization: UserOrganizationDetail;
  };
}

export interface SignUpResponseError {
  status: "error";
  message: string;
  code?: string;
}

export type SignUpResponse = SignUpResponseSuccess | SignUpResponseError;

// src/models/auth/domain/EntitlementLimits.ts
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
  window_start: string | null; // ISO
  window_end: string | null;   // ISO
  resets_at: string | null;    // ISO
  server_time: string;         // ISO
};

export type EntitlementLimitItem = {
  permission: PermissionLite;
  plan: PlanLite;
  limits: EntitlementLimits;
  usage: EntitlementUsage;
};

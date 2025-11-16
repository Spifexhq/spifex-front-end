// src/models/auth/dto/GetEntitlementLimits.ts
import type { EntitlementLimitItem, PlanLite } from "../domain/EntitlementLimits";

export interface GetEntitlementLimitsResponse {
  plan: PlanLite;
  items: EntitlementLimitItem[];
}

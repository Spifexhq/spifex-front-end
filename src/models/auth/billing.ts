// src/models/auth/billing.ts

/* ------------------------------ Subscription types ------------------------------ */

export type SubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | string;

export type PlanCode = "starter" | "pro";

export interface PlanRef {
  plan_code: PlanCode;
}

export interface Subscription {
  status: SubscriptionStatus;

  plan_code: string | null;
  plan_nickname: string | null;

  current_period_start: string | null;
  current_period_end: string | null;

  cancel_at_period_end: boolean;

  ended_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
}

export interface GetSubscriptionStatusResponse {
  is_subscribed: boolean;
  is_entitled: boolean;
  has_access: boolean;
  subscription: Subscription | null;
}

/* ------------------------------ Checkout / Portal ------------------------------ */

export interface CreateCheckoutSessionRequest {
  plan_code: PlanCode;
  country_code?: string;
}

export interface CreateCheckoutSessionResponse {
  url?: string;
  message?: string;
}

export type CreateCustomerPortalSessionRequest = Record<string, never>;

export interface CreateCustomerPortalSessionResponse {
  url?: string;
}

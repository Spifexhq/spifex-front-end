export type SubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | string; // keep string fallback for forward compatibility

export interface Subscription {
  status: SubscriptionStatus;

  plan_price_id: string | null;
  plan_nickname: string | null;

  // Stripe can momentarily produce partial objects / your webhook logs show missing periods.
  // Keep these nullable to avoid runtime crashes.
  current_period_start: string | null;
  current_period_end: string | null;

  cancel_at_period_end: boolean;

  // DateTimes serialized as ISO strings (or null)
  ended_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
}

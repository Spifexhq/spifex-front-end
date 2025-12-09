// models/auth/domain/Subscription.ts
export interface Subscription {
  status: string;
  plan_price_id: string;
  plan_nickname: string | null;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

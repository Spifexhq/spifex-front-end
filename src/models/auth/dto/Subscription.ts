export type Subscription = {
  id: number;
  user: number;
  stripe_subscription_id: string;
  status: string;
  plan_id: string;
  plan_nickname: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

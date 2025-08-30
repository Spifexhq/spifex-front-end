export interface Subscription {
  id: number;
  organization_id: number;
  stripe_subscription_id: string;
  status: string;
  plan_price_id: string;
  plan_product_id: string | null;
  plan_nickname: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan: {
    code: string | null;
    name: string | null;
    description: string | null;
  } | null;
  customer: {
    id: number;
    stripe_customer_id: string;
    default_payment_method_id: string | null;
    created_at: string;
  } | null;
}
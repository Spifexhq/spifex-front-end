export type SubscriptionStatus = "trial" | "active" | "canceled";

export interface SubscriptionStatusResponse {
  isSubscribed: boolean;
  activePlanId: string | null;
  status: SubscriptionStatus;
}

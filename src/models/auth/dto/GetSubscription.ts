import { Subscription } from "../domain/Subscription";

// models/auth/dto/GetSubscription.ts
export interface GetSubscriptionStatusResponse {
  is_subscribed: boolean;
  subscription: Subscription | null;
}
export type SubscriptionDTO = GetSubscriptionStatusResponse;
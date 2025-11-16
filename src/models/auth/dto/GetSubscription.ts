// models/auth/dto/GetSubscription.ts
import { Subscription } from "../domain/Subscription";

export interface GetSubscriptionStatusResponse {
  is_subscribed: boolean;
  subscription: Subscription | null;
}
export type SubscriptionDTO = GetSubscriptionStatusResponse;

// models/auth/dto/GetSubscription.ts
import { Subscription } from "../domain/Subscription";

export interface GetSubscriptionStatusResponse {
  is_subscribed: boolean;
  is_entitled: boolean;
  has_access: boolean;
  subscription: Subscription | null;
}

import { User, UserEnterpriseDetail } from "../domain";
import { SubscriptionStatusResponse } from "./Subscription";

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: User;
  enterprise: UserEnterpriseDetail;
  subscription: SubscriptionStatusResponse | null;
  refresh: string;
  access: string;
}

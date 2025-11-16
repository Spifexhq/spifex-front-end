// models/auth/dto/SignIn.ts
import { User, UserOrganizationDetail } from "../domain";
import { GetSubscriptionStatusResponse } from "./GetSubscription";

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: User;
  organization: UserOrganizationDetail;
  subscription: GetSubscriptionStatusResponse | null;
  permissions: string[];
  refresh: string;
  access: string;
}

import { User, UserEnterpriseDetail } from "../domain";
import { Subscription } from "./Subscription";

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: User;
  enterprise: UserEnterpriseDetail;
  subscription: Subscription | null;
  refresh: string;
  access: string;
}

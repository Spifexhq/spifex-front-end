import { User, UserOrganizationDetail } from "../domain";
import { Subscription } from "./Subscription";

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: User;
  organization: UserOrganizationDetail;
  subscription: Subscription | null;
  permissions: string[];
  refresh: string;
  access: string;
}

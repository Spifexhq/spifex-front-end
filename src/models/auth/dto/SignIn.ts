// models/auth/dto/SignIn.ts
import { User, UserOrganizationDetail } from "../domain";

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: User;
  organization: UserOrganizationDetail;
  is_subscribed: boolean;
  permissions: string[];
  refresh: string;
  access: string;
}

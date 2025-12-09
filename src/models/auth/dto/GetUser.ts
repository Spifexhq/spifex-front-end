// src/models/auth/dto/GetUser
import { User, UserOrganizationDetail } from "../domain";

export interface GetUserResponse {
  user: User;
  organization: UserOrganizationDetail;
  is_subscribed: boolean;
  permissions: string[];
}

import { User, UserOrganizationDetail } from "../domain";
import { Subscription } from "./Subscription";

export interface GetUserResponse {
  user: User;
  organization: UserOrganizationDetail;
  subscription: Subscription | null;
}

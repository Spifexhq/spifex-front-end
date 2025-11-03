import { User, UserOrganizationDetail } from "../domain";
import { Subscription } from "./GetSubscription";

export interface GetUserResponse {
  user: User;
  organization: UserOrganizationDetail;
  subscription: Subscription | null;
}

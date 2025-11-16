import { User, UserOrganizationDetail } from "../domain";
import { GetSubscriptionStatusResponse } from "./GetSubscription";

export interface GetUserResponse {
  user: User;
  organization: UserOrganizationDetail;
  subscription: GetSubscriptionStatusResponse | null;
  permissions: string[];
}

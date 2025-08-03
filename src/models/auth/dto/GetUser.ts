import { User, UserEnterpriseDetail } from "../domain";
import { Subscription } from "./Subscription";

export interface GetUserResponse {
  user: User;
  enterprise: UserEnterpriseDetail;
  subscription: Subscription | null;
}

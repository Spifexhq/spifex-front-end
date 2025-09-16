import { User, UserOrganizationDetail } from "../domain";

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  timezone: string;
  country: string;
}

export interface SignUpResponseSuccess {
  status: "success";
  message: string;
  data: {
    user: User;
    organization: UserOrganizationDetail;
  };
}

export interface SignUpResponseError {
  status: "error";
  message: string;
  code?: string;
}

export type SignUpResponse = SignUpResponseSuccess | SignUpResponseError;

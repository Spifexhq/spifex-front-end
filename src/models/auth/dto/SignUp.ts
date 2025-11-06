// src/models/auth/dto/SignUp.ts
import { User, UserOrganizationDetail } from "../domain";

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  timezone: string;
  country: string;
  language?: "en" | "pt" | "fr" | "de";
  currency?: "BRL" | "USD" | "EUR";
  browser_language?: string;
  browser_languages?: string[];
  locale?: string;
  consents?: {
    privacy_policy: boolean;
    terms_of_service: boolean;
    marketing?: boolean;
  };
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

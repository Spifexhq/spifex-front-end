// src/models/auth/auth.ts
import { User, UserOrganizationDetail } from "./user";

/* ---------------------------------- Sign In ---------------------------------- */

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

/* ---------------------------------- Sign Up ---------------------------------- */

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  timezone: string;
  country: string;
  language?: "en" | "pt" | "fr" | "de";
  currency: string;

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

/* ---------------------------------- Sign Out ---------------------------------- */

export type SignOutResponse = { ok: true } | Record<string, never>;

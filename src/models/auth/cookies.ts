// src/models/auth/cookies.ts

export interface CookieConsentRequest {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

export interface CookieConsentResponse {
  status: string;
  preferences: unknown;
}
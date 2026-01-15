// src/models/auth/auth/security.ts

/* ------------------------------ Change Password ------------------------------ */

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface PasswordChangeResponse {
  status: "pending";
  message: string;
}

/* -------------------------------- Change Email -------------------------------- */

export interface EmailChangeRequest {
  current_email: string;
  new_email: string;
  current_password: string;
}

export interface EmailChangeResponse {
  status: string;
  message: string;
}

/* ----------------------------- Password Reset Flow ---------------------------- */

export interface PasswordResetRequest {
  email: string;
}

export type PasswordResetResponse = void;

export interface VerifyPasswordResetRequest {
  password: string;
  password_confirm: string;
}

export type VerifyPasswordResetResponse = void;

/* ------------------------ Password Change Confirmation ------------------------ */

export interface VerifyPasswordChangeResponse {
  status: "confirmed";
}

/* ------------------------ Two-Factor Authentication ------------------------ */

export interface TwoFactorSettingsResponse {
  enabled: boolean;
  method: "email";
}

export interface TwoFactorSettingsUpdateRequest {
  enabled: boolean;
  current_password: string;
}

/* ------------------------ Security ------------------------ */

export type SecurityStatusResponse = {
  email: string;
  last_password_change: string;
  two_factor_enabled: boolean;
};
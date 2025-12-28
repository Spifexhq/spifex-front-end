// src/models/auth/auth/security.ts

/* ------------------------------ Change Password ------------------------------ */

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export type ChangePasswordResponse = unknown;

/* -------------------------------- Change Email -------------------------------- */

export interface ChangeEmailRequest {
  current_email: string;
  new_email: string;
  current_password: string;
}

export interface ChangeEmailResponse {
  status: string;
  message: string;
}

/* ----------------------------- Password Reset Flow ---------------------------- */

export interface RequestPasswordResetRequest {
  email: string;
}

export type RequestPasswordResetResponse = void;

export interface ConfirmPasswordResetRequest {
  password: string;
  password_confirm: string;
}

export type ConfirmPasswordResetResponse = void;

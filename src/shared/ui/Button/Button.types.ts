// src/components/ui/Button.types.ts
import * as React from "react";

export type ButtonVariant =
  | "primary"
  | "common"
  | "cancel"
  | "danger"
  | "outline"
  | "outlineBlack"
  | "ghost"
  | "muted";

export type ButtonSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "iconSm"
  | "iconMd"
  | "iconLg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}
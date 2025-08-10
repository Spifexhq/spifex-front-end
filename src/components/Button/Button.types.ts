import * as React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "common"
  | "outline"
  | "danger"
  | "link"
  | "cancel"

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loaderColor?: string;
  fullWidth?: boolean;
}

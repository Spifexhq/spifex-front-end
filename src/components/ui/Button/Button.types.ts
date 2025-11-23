import * as React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "common"
  | "cancel"
  | "danger"
  | "outline"
  | "outlineBlack"
  | "link"
  | "outlinePrimary"
  | "outlineDanger"
  | "ghost"
  | "softPrimary"
  | "muted"
  | "success"
  | "warning"
  | "info"
  | "dashed"
  | "gradient"

export type ButtonSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  // ícone-only (quadrados)
  | "iconSm"
  | "iconMd"
  | "iconLg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

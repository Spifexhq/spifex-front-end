import type React from "react";

export type AmountInputVariant = "default" | "outlined" | "filled";
export type AmountInputSize = "xs" | "sm" | "md" | "lg" | "xl";

export type AmountInputBaseProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange" | "onKeyDown" | "inputMode" | "pattern" | "size"
>;

export interface AmountInputProps extends AmountInputBaseProps {
  variant?: AmountInputVariant;
  size?: AmountInputSize;

  label?: string;
  errorMessage?: string;
  style?: React.CSSProperties;

  /** kept for compatibility with Input-like props; ignored */
  showTogglePassword?: boolean;

  isLoading?: boolean;

  value: string;
  onValueChange: (nextMajor: string) => void;

  display?: "currency" | "amount";
  zeroAsEmpty?: boolean;
  currency?: string;
  allowNegative?: boolean;
}

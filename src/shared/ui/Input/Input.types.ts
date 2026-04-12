// src/shared/ui/Input/Input.types.ts
import type React from "react";

export type InputKind = "text" | "amount" | "percentage" | "date";
export type InputVariant = "default" | "outlined" | "filled";
export type InputSize = "xs" | "sm" | "md" | "lg" | "xl";

export type AmountDisplay = "currency" | "amount";

export type InputMessageTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type InputLabelChip = {
  label: React.ReactNode;
  tone?: InputMessageTone;
};

export type InputCommonProps = {
  kind?: InputKind;
  label?: React.ReactNode;
  labelChip?: InputLabelChip;
  errorMessage?: React.ReactNode;
  variant?: InputVariant;
  size?: InputSize;
  isLoading?: boolean;
  style?: React.CSSProperties;
};

export type TextInputProps = InputCommonProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
    kind?: "text";
    showTogglePassword?: boolean;
  };

type AmountInputBaseProps = InputCommonProps &
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    | "type"
    | "value"
    | "defaultValue"
    | "onChange"
    | "onKeyDown"
    | "inputMode"
    | "pattern"
    | "size"
  > & {
    kind: "amount";
    display?: AmountDisplay;
    zeroAsEmpty?: boolean;
    currency?: string;
    allowNegative?: boolean;
  };

export type AmountInputStringProps = AmountInputBaseProps & {
  valueType?: "string";
  value: string | "";
  onValueChange: (nextMajor: string) => void;
};

export type AmountInputNumberProps = AmountInputBaseProps & {
  valueType: "number";
  value: number | "";
  onValueChange: (next: number | "") => void;
};

export type AmountInputProps = AmountInputStringProps | AmountInputNumberProps;

export type PercentageInputProps = InputCommonProps &
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    | "type"
    | "value"
    | "defaultValue"
    | "onChange"
    | "onKeyDown"
    | "inputMode"
    | "pattern"
    | "size"
  > & {
    kind: "percentage";
    value: string;
    onValueChange: (nextMajor: string) => void;
    zeroAsEmpty?: boolean;
    allowNegative?: boolean;
  };

export type DateInputProps = InputCommonProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size"> & {
    kind: "date";
    value?: string;
    onValueChange?: (valueIso: string) => void;
  };

export type InputProps =
  | TextInputProps
  | AmountInputProps
  | PercentageInputProps
  | DateInputProps;
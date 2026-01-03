import type React from "react";

export type InputKind = "text" | "amount" | "date";
export type InputVariant = "default" | "outlined" | "filled";
export type InputSize = "xs" | "sm" | "md" | "lg" | "xl";

export type AmountDisplay = "currency" | "amount";

/** Shared props across all kinds */
export type InputCommonProps = {
  kind?: InputKind;

  label?: string;
  errorMessage?: string;

  variant?: InputVariant;
  size?: InputSize;

  isLoading?: boolean;

  /** Wrapper style */
  style?: React.CSSProperties;
};

/** TEXT input props (native input) */
export type TextInputProps = InputCommonProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
    kind?: "text";
    showTogglePassword?: boolean;
  };

/** AMOUNT input props (major string like "1234.56") */
export type AmountInputProps = InputCommonProps &
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

    value: string;
    onValueChange: (nextMajor: string) => void;

    display?: AmountDisplay;
    zeroAsEmpty?: boolean;
    currency?: string;
    allowNegative?: boolean;
  };

/** DATE input props (ISO string "yyyy-MM-dd") */
export type DateInputProps = InputCommonProps &
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "size"
  > & {
    kind: "date";
    value?: string;
    onValueChange?: (valueIso: string) => void;
  };

export type InputProps = TextInputProps | AmountInputProps | DateInputProps;

import type React from "react";

export type InputKind = "text" | "amount" | "percentage" | "date";
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

/** AMOUNT base props */
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
  } & (
    | { value: string; onValueChange: (next: string) => void }
    | { value: number; onValueChange: (next: number) => void }
  );

/** AMOUNT input props (string-mode: major string like "1234.56") */
export type AmountInputStringProps = AmountInputBaseProps & {
  valueType?: "string"; // default
  value: string;
  onValueChange: (nextMajor: string) => void;
};

/** AMOUNT input props (number-mode: decimal number like 1234.56) */
export type AmountInputNumberProps = AmountInputBaseProps & {
  valueType: "number";
  value: number;
  onValueChange: (next: number) => void;
};

export type AmountInputProps = AmountInputStringProps | AmountInputNumberProps;

/** PERCENTAGE input props (major string like "12.34" representing 12.34%) */
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

    /** Canonical major string with 2 decimals, e.g. "12.34" (no "%") */
    value: string;
    onValueChange: (nextMajor: string) => void;

    /** Same semantics as AmountField */
    zeroAsEmpty?: boolean;
    allowNegative?: boolean;
  };

/** DATE input props (ISO string "yyyy-MM-dd") */
export type DateInputProps = InputCommonProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size"> & {
    kind: "date";
    value?: string;
    onValueChange?: (valueIso: string) => void;
  };

export type InputProps = TextInputProps | AmountInputProps | PercentageInputProps | DateInputProps;

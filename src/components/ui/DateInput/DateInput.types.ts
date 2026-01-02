/**
 * DateInput.types.ts
 *
 * This file defines the types for the DateInput component.
 *
 * Features:
 * - Segmented date input (day / month / year) with locale-aware order
 * - Supports multiple visual variants: "default", "outlined", "filled"
 * - Supports visual sizes: "xs" | "sm" | "md" | "lg" | "xl"
 * - Allows an optional label for better accessibility
 * - Displays an error message when validation fails
 * - Emits/receives dates as ISO strings: "YYYY-MM-DD"
 * - Extends `React.InputHTMLAttributes<HTMLInputElement>` (minus type/value/onChange/size)
 *
 * Usage:
 * ```tsx
 * <DateInput size="sm" label="Due date" value="2025-11-23" onChange={(iso) => console.log(iso)} />
 * ```
 */

import type React from "react";

export type EffectiveDateCode = "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO";

export type DateInputVariant = "default" | "outlined" | "filled";

/** Button-like visual sizes (avoid native numeric input `size` conflict) */
export type DateInputSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface DateInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "size"
  > {
  /** ISO date value in the format "YYYY-MM-DD" or empty string */
  value?: string;
  /** Called with a valid ISO date ("YYYY-MM-DD") or empty string when cleared */
  onChange?: (valueIso: string) => void;
  /** Optional label rendered above the field */
  label?: string;
  /** Optional error message rendered below the field */
  errorMessage?: string;
  /** Visual variant to match the regular Input component */
  variant?: DateInputVariant;
  /** Visual size tokens */
  size?: DateInputSize;
}

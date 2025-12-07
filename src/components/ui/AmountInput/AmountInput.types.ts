/**
 * AmountInput.types.ts
 * 
 * This file defines the types for the AmountInput component.
 * 
 * Features:
 * - Supports multiple input variants: "default", "outlined", "filled", "error"
 * - Allows an optional label for better accessibility
 * - Displays an error message when validation fails
 * - Supports a toggle button for password visibility
 * - Handles loading state to disable input interaction
 * - Extends `React.InputHTMLAttributes<HTMLInputElement>` for full HTML input functionality
 * 
 * Usage:
 * ```tsx
 * <AmountInput variant="outlined" label="Username" placeholder="Enter your name" />
 * <AmountInput type="password" label="Password" showTogglePassword />
 * <AmountInput variant="error" errorMessage="This field is required" />
 * ```
 */

export type AmountInputVariant = 'default' | 'outlined' | 'filled';

export interface AmountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: AmountInputVariant;
  label?: string;
  errorMessage?: string;
  style?: React.CSSProperties;
  showTogglePassword?: boolean;
  isLoading?: boolean;
}

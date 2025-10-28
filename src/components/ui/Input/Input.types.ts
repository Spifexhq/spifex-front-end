/**
 * Input.types.ts
 * 
 * This file defines the types for the Input component.
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
 * <Input variant="outlined" label="Username" placeholder="Enter your name" />
 * <Input type="password" label="Password" showTogglePassword />
 * <Input variant="error" errorMessage="This field is required" />
 * ```
 */

export type InputVariant = 'default' | 'outlined' | 'filled';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  label?: string;
  errorMessage?: string;
  style?: React.CSSProperties;
  showTogglePassword?: boolean;
  isLoading?: boolean;
}

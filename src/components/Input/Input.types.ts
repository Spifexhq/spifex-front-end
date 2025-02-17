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

export type InputVariant = 'default' | 'outlined' | 'filled' | 'error';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Defines the input style variant
  variant?: InputVariant;

  // Displays a label above the input
  label?: string;

  // Shows an error message below the input
  errorMessage?: string;

  // Inline styles for custom styling
  style?: React.CSSProperties;

  // Enables a toggle button for password visibility
  showTogglePassword?: boolean;

  // Disables input and shows a loading state
  isLoading?: boolean;
}

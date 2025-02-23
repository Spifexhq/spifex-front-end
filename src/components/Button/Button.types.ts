/**
 * Button.types.ts
 * 
 * This file defines the types for the Button component.
 * 
 * Features:
 * - Supports multiple button variants: "primary", "secondary", "outline", "danger", "link"
 * - Includes a loading state (`isLoading`) to show a spinner instead of button content
 * - Allows customization via `className` and `style`
 * - Extends `React.ButtonHTMLAttributes<HTMLButtonElement>` for full button functionality
 * 
 * Usage:
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>Click Me</Button>
 * <Button variant="danger" isLoading loaderColor="white">Processing...</Button>
 * ```
 */

export type ButtonVariant = 'primary' | 'secondary' | 'common' | 'outline' | 'danger' | 'link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Defines the button style variant
  variant?: ButtonVariant;

  // Enables a loading state, replacing the button content with a spinner
  isLoading?: boolean;

  // Sets the color of the loading spinner
  loaderColor?: string;

  // The content inside the button
  children: React.ReactNode;

  // Inline styles for custom styling
  style?: React.CSSProperties;

  // Custom CSS class for additional styling
  className?: string;
}

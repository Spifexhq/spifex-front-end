/**
 * Alert.types.ts
 * 
 * This file defines the types for the Alert component.
 * 
 * Features:
 * - Supports different severity levels: "success", "error", "warning", "info"
 * - Accepts custom CSS classes for additional styling
 * - Uses ReactNode as children for flexible content
 * 
 * Usage:
 * ```tsx
 * <Alert severity="warning">This is a warning message</Alert>
 * <Alert severity="success" className="custom-class">Operation completed!</Alert>
 * ```
 */

export interface AlertProps {
  // Defines the alert type to customize colors
  severity?: "success" | "error" | "warning" | "info";

  // Alert content (message)
  children: React.ReactNode;

  // Optional CSS class for customization
  className?: string;
}

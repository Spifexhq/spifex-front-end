/**
 * Snackbar.types.ts
 * 
 * This file defines the types for the Snackbar component.
 * 
 * Features:
 * - Controls the visibility of the Snackbar (`open` prop)
 * - Supports an automatic close timer (`autoHideDuration`)
 * - Executes a callback function when the Snackbar closes (`onClose`)
 * - Allows customization via a `className`
 * - Accepts children content, usually an `Alert` component
 * 
 * Usage:
 * ```tsx
 * <Snackbar open={true} autoHideDuration={3000} onClose={handleClose}>
 *   <Alert severity="success">Operation successful!</Alert>
 * </Snackbar>
 * ```
 */

export interface SnackbarProps {
  // Determines whether the Snackbar is open
  open: boolean;

  // Time (in ms) to automatically close the Snackbar
  autoHideDuration?: number;

  // Callback called when Snackbar closes
  onClose: () => void;

  // Optional CSS class for customization
  className?: string;

  // Content within the Snackbar (usually an Alert)
  children: React.ReactNode;
}

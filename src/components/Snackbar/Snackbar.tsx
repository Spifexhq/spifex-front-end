/**
 * Snackbar.tsx
 * 
 * This component renders a temporary notification (Snackbar) using React portals.
 * 
 * Features:
 * - Supports automatic dismissal (`autoHideDuration`)
 * - Uses CSS animations for smooth fade-in/out effects
 * - Closes on timeout or when the `onClose` function is called
 * - Uses React portals to render in `document.body`
 * - Accepts children content (typically an `Alert` component)
 * 
 * Usage:
 * ```tsx
 * <Snackbar open={true} autoHideDuration={3000} onClose={handleClose}>
 *   <Alert severity="success">Operation successful!</Alert>
 * </Snackbar>
 * ```
 */

import React, { useEffect, useState } from "react";
import Alert from "@/components/Alert";   
import { createPortal } from "react-dom";
import styles from "./Snackbar.module.css";
import { SnackbarProps } from "./Snackbar.types";

const Snackbar: React.FC<SnackbarProps> = ({
  open,
  autoHideDuration,
  onClose,
  className = "",
  message,
  severity = "info",
  children,
}) => {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open && autoHideDuration) {
      const timer = setTimeout(onClose, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [open, autoHideDuration, onClose]);

  if (!visible) return null;

  const content = message ? (
    <Alert severity={severity}>{message}</Alert>
  ) : (
    children
  );

  return createPortal(
    <div
      className={`${styles.snackbar} ${
        open ? styles.open : styles.closed
      } ${className}`}
    >
      {content}
    </div>,
    document.body
  );
};

export default Snackbar;

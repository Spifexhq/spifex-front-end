import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Snackbar.module.css";
import { SnackbarProps } from "./Snackbar.types";

const Snackbar: React.FC<SnackbarProps> = ({
  open,
  autoHideDuration,
  onClose,
  className = "",
  children,
}) => {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 300); // Fade-out delay
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

  return createPortal(
    <div className={`${styles.snackbar} ${open ? styles.open : styles.closed} ${className}`}>
      {children}
    </div>,
    document.body
  );
};

export default Snackbar;

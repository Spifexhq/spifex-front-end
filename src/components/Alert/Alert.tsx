/**
 * Alert.tsx
 * 
 * This component renders an alert box with different severity levels (info, warning, error, success).
 * It supports additional custom styling through `className`.
 * 
 * Features:
 * - Different severity levels: "info", "warning", "error", "success"
 * - Customizable via `className`
 * - Uses CSS modules for styling
 * 
 * Usage:
 * ```tsx
 * <Alert severity="error">This is an error message</Alert>
 * <Alert severity="success" className="myCustomAlert">Operation successful!</Alert>
 * ```
 */

import React from "react";
import styles from "./Alert.module.css";
import { AlertProps } from "./Alert.types";

const Alert: React.FC<AlertProps> = ({
  severity = "info",
  children,
  className = "",
}) => {
  // Sets the class based on the alert type
  const alertClass = `${styles.alert} ${styles[severity]} ${className}`;

  return <div className={alertClass}>{children}</div>;
};

export default Alert;

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

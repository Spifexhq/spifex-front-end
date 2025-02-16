export interface AlertProps {
    /** Define the alert type to customize the colors */
    severity?: "success" | "error" | "warning" | "info";
    /** Alert content (message) */
    children: React.ReactNode;
    /** Optional CSS class for customization */
    className?: string;
  }
  
export interface SnackbarProps {
    /** Determines whether the Snackbar is open */
    open: boolean;
    /** Time (in ms) to automatically close the Snackbar */
    autoHideDuration?: number;
    /** Callback called when Snackbar closes */
    onClose: () => void;
    /** Optional CSS class for customization */
    className?: string;
    /** Content within the Snackbar (usually an Alert) */
    children: React.ReactNode;
  }
  
import React from "react";
import { useTranslation } from "react-i18next";

export const Spinner: React.FC<{ size?: number; className?: string; label?: string }> = ({ size = 18, className = "", label }) => {
  const { t } = useTranslation("common");
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="status"
      aria-label={label ?? t("loading")}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" className="opacity-80" />
    </svg>
  );
};
export default Spinner;

import React from "react";
import { useTranslation } from "react-i18next";

const BusyOverlay: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
      <span>{label}</span>
    </div>
  </div>
);

export const ModalShell: React.FC<{
  title: string;
  busy: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}> = ({ title, busy, onClose, children, maxWidthClass = "max-w-3xl" }) => {
  const { t } = useTranslation(["filterBar"]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
      <div
        className={`bg-white border border-gray-200 rounded-lg p-5 w-full ${maxWidthClass} max-h-[90vh] relative`}
      >
        {busy && <BusyOverlay label={t("filterBar:configModal.loading")} />}

        <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
          <h3 className="text-[14px] font-semibold text-gray-800">{title}</h3>
          <button
            className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
        </header>

        {children}
      </div>
    </div>
  );
};

// src/pages/AccountingSettings/components/AccountingSideModal.tsx
import React from "react";
import { X } from "lucide-react";

type Props = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
};

const AccountingSideModal: React.FC<Props> = ({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  contentClassName = "",
}) => {
  const [mounted, setMounted] = React.useState(isOpen);
  const [visible, setVisible] = React.useState(isOpen);

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setVisible(false);

      const id = window.setTimeout(() => setVisible(true), 16);
      return () => window.clearTimeout(id);
    }

    setVisible(false);

    const id = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  React.useEffect(() => {
    if (!mounted) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounting-side-modal-title"
        className={[
          "absolute inset-y-0 right-0 flex h-full w-full max-w-[880px] flex-col border-l border-gray-200 bg-white",
          "transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                Accounting settings
              </div>
              <h3
                id="accounting-side-modal-title"
                className="mt-1 truncate text-[18px] font-semibold text-gray-900"
              >
                {title}
              </h3>
              {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 md:px-6 md:pt-6">
          <div className={`flex flex-col ${contentClassName}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingSideModal;
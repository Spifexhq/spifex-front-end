import { SettingsModalContent } from "@/shared/ui/Settings/SettingsModalContent";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
// src/pages/AccountingSettings/components/AccountingSideModal.tsx
import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("accountingSettings");

  const dialogRef = React.useRef<HTMLDivElement>(null);
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

  useDialogFocus(isOpen && mounted, dialogRef);

  if (!mounted) return null;

  return (
    <div className="accounting-dialog fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-gray-950/20" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounting-side-modal-title"
        className={[
          "settings-drawer settings-modal",
          "transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-200 bg-white/95">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                {t("modal.sectionLabel", { defaultValue: "Accounting settings" })}
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
              className="settings-modal-close"
              aria-label={t("modal.close", { defaultValue: "Close" })}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="settings-modal-content">
          <SettingsModalContent><div className={`settings-modal-inner ${contentClassName}`}>{children}</div></SettingsModalContent>
        </div>
      </div>
    </div>
  );
};

export default AccountingSideModal;
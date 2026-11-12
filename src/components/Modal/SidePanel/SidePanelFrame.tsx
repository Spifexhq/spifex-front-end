import type { ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import DialogShell from "@/shared/ui/DialogShell";
import "./side-panel.css";

type SidePanelFrameProps = {
  isOpen: boolean;
  labelledBy: string;
  header: ReactNode;
  children: ReactNode;
  onClose(): void;
  closeOnBackdrop?: boolean;
  busy?: boolean;
  dialogRef?: RefObject<HTMLDivElement>;
  className?: string;
  overlay?: ReactNode;
};

export function SidePanelFrame({ isOpen, labelledBy, header, children, onClose, closeOnBackdrop = false, busy = false, dialogRef, className = "", overlay }: SidePanelFrameProps) {
  const { t } = useTranslation("common");
  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      closeLabel={t("modal.close")}
      labelledBy={labelledBy}
      header={header}
      panelRef={dialogRef}
      variant="drawer"
      panelClassName={className}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
      closeOnBackdrop={closeOnBackdrop}
      busy={busy}
      escapeEnabled={!overlay}
      overlay={overlay}
    >
      {children}
    </DialogShell>
  );
}

export function SidePanelHeader({ title, titleId, subtitle, eyebrow, onClose, disabled = false, children }: { title: ReactNode; titleId: string; subtitle?: ReactNode; eyebrow?: ReactNode; onClose(): void; disabled?: boolean; children?: ReactNode }) {
  const { t } = useTranslation("common");
  return <header className={children ? "settings-modal-standard-header settings-modal-header-with-tabs" : "settings-modal-standard-header"}>
    <div className="settings-modal-heading-row"><div className="min-w-0"><p className="settings-modal-kicker">{eyebrow ?? t("header.settings")}</p><h2 id={titleId} className="settings-modal-title">{title}</h2>{subtitle && <p className="settings-modal-subtitle">{subtitle}</p>}</div>
      <button type="button" className="settings-modal-close" onClick={onClose} disabled={disabled} aria-label={t("modal.close")}><X size={18} aria-hidden="true" /></button>
    </div>{children}
  </header>;
}

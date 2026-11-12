import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import DialogShell from "@/shared/ui/DialogShell";

export function ModalShell({ title, busy, onClose, children, maxWidthClass = "max-w-3xl" }: {
  title: string; busy: boolean; onClose(): void; children: ReactNode; maxWidthClass?: string;
}) {
  const { t } = useTranslation("filterBar");
  return <DialogShell
    open
    onClose={onClose}
    closeLabel={t("configModal.close")}
    title={title}
    busy={busy}
    maxWidthClass={maxWidthClass}
    bodyClassName="overflow-y-auto overscroll-contain p-5"
    panelOverlay={busy ? <div role="status" className="absolute inset-0 flex items-center justify-center bg-white/75 text-xs text-gray-600">{t("configModal.loading")}</div> : undefined}
  >{children}</DialogShell>;
}

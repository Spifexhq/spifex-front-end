import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";

export function ModalShell({ title, busy, onClose, children, maxWidthClass = "max-w-3xl" }: {
  title: string; busy: boolean; onClose(): void; children: ReactNode; maxWidthClass?: string;
}) {
  const { t } = useTranslation("filterBar");
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reduced = useReducedMotion();
  useDialogFocus(true, dialog);
  return createPortal(<div className="fixed inset-0 z-[10030] flex items-center justify-center bg-gray-950/25 p-3 sm:p-6">
    <motion.div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}
      initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .15 }}
      className={`relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ${maxWidthClass}`}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h3 id={titleId} className="text-sm font-semibold text-gray-900">{title}</h3>
        <button type="button" disabled={busy} onClick={onClose} aria-label={t("configModal.close")}
          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-gray-400 disabled:opacity-40"><X size={16} aria-hidden /></button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5">{children}</div>
      {busy && <div role="status" className="absolute inset-0 flex items-center justify-center bg-white/75 text-xs text-gray-600">{t("configModal.loading")}</div>}
    </motion.div>
  </div>, document.body);
}

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
export function SettingsModalFrame({ isOpen, labelledBy, children, dialogRef, className = "", onBackdropClose }: { isOpen: boolean; labelledBy: string; children: ReactNode; dialogRef?: RefObject<HTMLDivElement>; className?: string; onBackdropClose?: () => void }) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = dialogRef ?? localRef;
  const reduced = useReducedMotion();
  useDialogFocus(isOpen, ref);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);
  return <AnimatePresence>{isOpen && <motion.div className={`fixed inset-0 z-[9999] bg-black/40 ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .18, ease: "easeOut" }} onClick={event => { if (event.target === event.currentTarget) onBackdropClose?.(); }}>
    <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="settings-drawer settings-modal" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: reduced ? 0 : .18, ease: "easeOut" }}>
      {children}
    </motion.div>
  </motion.div>}</AnimatePresence>;
}
export function SettingsModalHeader({ title, titleId, subtitle, onClose, disabled = false, children }: { title: ReactNode; titleId: string; subtitle?: ReactNode; onClose(): void; disabled?: boolean; children?: ReactNode }) {
  const { t } = useTranslation("common");
  return <header className={children ? "settings-modal-standard-header settings-modal-header-with-tabs" : "settings-modal-standard-header"}>
    <div className="settings-modal-heading-row"><div className="min-w-0"><p className="settings-modal-kicker">{t("header.settings")}</p><h2 id={titleId} className="settings-modal-title">{title}</h2>{subtitle && <p className="settings-modal-subtitle">{subtitle}</p>}</div>
      <button type="button" className="settings-modal-close" onClick={onClose} disabled={disabled} aria-label={t("modal.close")}><X size={18} /></button>
    </div>{children}
  </header>;
}

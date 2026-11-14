import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import SidePanel from "@/components/Modal/SidePanel";
import AccountingReviewGuideContent from "./AccountingReviewGuideContent";
import { AccountingReviewGuideContext } from "./AccountingReviewGuideState";

function Panel({ open, close }: { open: boolean; close(): void }) {
  const { t } = useTranslation("accountingSettings");
  return <SidePanel isOpen={open} mode="edit" onClose={close} title={t("nav.reconciliation")} subtitle={t("redesign.guide.description")} eyebrow={t("section.operations")}>
    <div className="settings-modal-scroll p-4 sm:p-5">{open ? <AccountingReviewGuideContent onNavigate={close}/> : null}</div>
  </SidePanel>;
}

export function AccountingReviewGuideProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openGuide: () => setOpen(true), closeGuide: close }), [open, close]);
  return <AccountingReviewGuideContext.Provider value={value}>{children}<Panel open={open} close={close}/></AccountingReviewGuideContext.Provider>;
}

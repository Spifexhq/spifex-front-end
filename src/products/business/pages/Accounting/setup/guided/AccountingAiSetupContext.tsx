import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import SidePanel from "@/components/Modal/SidePanel";
import { useTranslation } from "react-i18next";
import { ArchiveRestore, Trash2 } from "lucide-react";
import Button from "@/shared/ui/Button";
import AccountingAiSetupWizard from "./AccountingAiSetupWizard";
import { clearAiSetupScratch } from "./AccountingAiSetupScratch";
import { AccountingAiSetupContext } from "./AccountingAiSetupState";

function ClosePrompt({ onKeep, onDiscard, onContinue }: { onKeep(): void; onDiscard(): void; onContinue(): void }) {
  const { t } = useTranslation("accountingSettings");
  return <section className="space-y-5" aria-labelledby="ai-setup-close-title">
    <div>
      <h3 id="ai-setup-close-title" className="text-base font-semibold text-gray-900">{t("guidedSetup.closeTitle")}</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">{t("guidedSetup.closeBody")}</p>
    </div>
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs leading-6 text-gray-600">{t("guidedSetup.scratchNotice")}</p>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button variant="ghost" onClick={onContinue}>{t("guidedSetup.continueEditing")}</Button>
      <Button variant="outline" className="gap-2" onClick={onKeep}><ArchiveRestore size={15} aria-hidden="true"/>{t("guidedSetup.keepScratch")}</Button>
      <Button variant="danger" className="gap-2" onClick={onDiscard}><Trash2 size={15} aria-hidden="true"/>{t("guidedSetup.discardAnswers")}</Button>
    </div>
  </section>;
}

function Panel({ open, source, closeSetup, confirming, finishClose, continueEditing, busy }: {
  open: boolean;
  source: string;
  closeSetup(): void;
  confirming: boolean;
  finishClose(discard: boolean): void;
  continueEditing(): void;
  busy: boolean;
}) {
  const { t } = useTranslation("accountingSettings");
  return <SidePanel
    isOpen={open}
    mode="edit"
    onClose={closeSetup}
    busy={busy}
    title={t("guidedSetup.title")}
    subtitle={t("guidedSetup.description")}
    eyebrow={t("guidedSetup.eyebrow")}
  >
    <div className="settings-modal-scroll p-4 sm:p-5">
      {open ? confirming
        ? <ClosePrompt onContinue={continueEditing} onKeep={() => finishClose(false)} onDiscard={() => finishClose(true)} />
        : <AccountingAiSetupWizard key={`${open}-${source}`} source={source} onClose={closeSetup} /> : null}
    </div>
  </SidePanel>;
}

export function AccountingAiSetupProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("overview");
  const [hasProgress, setHasProgress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const openSetup = useCallback((next?: string) => {
    setSource(next || location.pathname.split("/")[2] || "overview");
    setConfirming(false);
    setBusy(false);
    setOpen(true);
  }, [location.pathname]);
  const finishClose = useCallback((discard: boolean) => {
    if (discard || !hasProgress) clearAiSetupScratch();
    setConfirming(false);
    setHasProgress(false);
    setBusy(false);
    setOpen(false);
  }, [hasProgress]);
  const closeSetup = useCallback(() => {
    if (busy) return;
    if (confirming) { finishClose(false); return; }
    if (hasProgress) { setConfirming(true); return; }
    finishClose(false);
  }, [busy, confirming, hasProgress, finishClose]);
  const continueEditing = useCallback(() => setConfirming(false), []);
  const value = useMemo(() => ({ open, source, openSetup, closeSetup, hasProgress, setHasProgress, busy, setBusy }), [open, source, openSetup, closeSetup, hasProgress, busy]);
  return <AccountingAiSetupContext.Provider value={value}>
    {children}
    <Panel open={open} source={source} closeSetup={closeSetup} confirming={confirming} finishClose={finishClose} continueEditing={continueEditing} busy={busy}/>
  </AccountingAiSetupContext.Provider>;
}

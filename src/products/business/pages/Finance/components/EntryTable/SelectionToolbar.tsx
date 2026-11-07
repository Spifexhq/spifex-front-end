import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, RotateCcw, Trash2, X } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatCurrency } from "@/lib";
import Button from "@/shared/ui/Button";
import type { Entry } from "@/models/entries/entries";
import { type FinancialEntry, entryId, signedAmount, isSettlement } from "./entryRows";
export default function SelectionToolbar({ entries, settled, onClear, onRefresh, onChanged, onSettle, onBusyChange }: {
    entries: FinancialEntry[];
    settled: boolean;
    onClear(): void;
    onRefresh(): Promise<void>;
    onChanged?(): void;
    onSettle?(entries: Entry[]): void;
    onBusyChange(busy: boolean): void;
}) {
    const { t } = useTranslation("financeEntries");
    const auth = useAuthContext();
    const reduced = useReducedMotion();
    const allowed = (code: string) => auth.isOwner || auth.isSuperUser || auth.permissions.includes(code);
    const [confirm, setConfirm] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const selectionKey = JSON.stringify([settled, entries.map(entryId).sort()]);
    const confirming = confirm === selectionKey;
    const submitting = useRef(false);
    const restoreFocus = useRef(false);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const actionRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { if (confirm && confirm !== selectionKey) setConfirm(null); }, [confirm, selectionKey]);
    const cancel = () => { if (!submitting.current) { restoreFocus.current = true; setConfirm(null); setError(""); } };
    const totals = useMemo(() => entries.reduce((result, entry) => { const amount = Math.round(signedAmount(entry) * 100); if (amount >= 0)
        result.income += amount;
    else
        result.expense -= amount; return result; }, { income: 0, expense: 0 }), [entries]);
    const remove = async () => { if (submitting.current || !confirming || !allowed(settled ? "delete_settled_entries" : "delete_cash_flow_entries") || !entries.length)
        return; submitting.current = true; setBusy(true); onBusyChange(true); setError(""); try {
        const ids = entries.map(entryId);
        if (settled) {
            if (ids.length > 1)
                await api.deleteSettledEntriesBulk(ids);
            else
                await api.deleteSettledEntry(ids[0]);
        }
        else {
            if (ids.length > 1)
                await api.deleteEntriesBulk(ids);
            else
                await api.deleteEntry(ids[0]);
        }
        setConfirm(null);
        onClear();
        await onRefresh();
        onChanged?.();
    }
    catch (cause) {
        setError(apiErrorMessage(cause, t("actionError")));
    }
    finally {
        submitting.current = false;
        setBusy(false);
        onBusyChange(false);
    } };
    return <>
 {createPortal(<AnimatePresence>{entries.length > 0 && <motion.aside layout role="region" aria-label={t("selectionActions")} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: reduced ? 0 : .15 }} className="fixed bottom-4 left-1/2 z-[9000] w-[calc(100vw-24px)] max-w-3xl -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_32px_#26334d20] sm:bottom-6 sm:p-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-gray-900">{t("selected", { count: entries.length })}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500"><span>{t("income")} <b className="font-medium text-emerald-700">{formatCurrency(totals.income / 100)}</b></span><span>{t("expense")} <b className="font-medium text-rose-700">{formatCurrency(totals.expense / 100)}</b></span><span>{t("net")} <b className="font-medium text-gray-900">{formatCurrency((totals.income - totals.expense) / 100)}</b></span></div></div><button type="button" disabled={busy} aria-label={t("clearSelection")} title={t("clearSelection")} onClick={onClear} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-800"><X size={15}/></button></div>
  <AnimatePresence mode="wait" initial={false}>
    {confirming ? <motion.div key="confirmation" initial={{opacity:0,y:reduced ? 0 : 5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced ? 0 : -4}} transition={{duration:reduced ? 0 : .15}} onAnimationComplete={() => { if (!busy) cancelRef.current?.focus({preventScroll:true}); }} role="group" aria-label={t(settled ? "confirmReopen" : "confirmDelete", {count:entries.length})} onKeyDown={event => { if (event.key === "Escape" && !busy) { event.preventDefault(); event.stopPropagation(); cancel(); } }} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <p role="status" className="text-xs leading-5 text-gray-700">{t(settled ? "confirmReopen" : "confirmDelete", {count:entries.length})}</p>
      <div className="flex flex-wrap justify-end gap-2"><Button ref={cancelRef} type="button" size="sm" variant="outline" disabled={busy} onClick={cancel}>{t("cancel")}</Button><Button type="button" size="sm" variant="danger" isLoading={busy} disabled={busy} onClick={() => void remove()} className="gap-1.5">{settled ? <RotateCcw size={13}/> : <Trash2 size={13}/>} {t(settled ? "reopen" : "delete")}</Button></div>
    </motion.div> : <motion.div key="actions" initial={{opacity:0,y:reduced ? 0 : 5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced ? 0 : -4}} transition={{duration:reduced ? 0 : .15}} onAnimationComplete={() => { if (restoreFocus.current) { restoreFocus.current = false; actionRef.current?.focus({preventScroll:true}); } }} className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
      {!settled && onSettle && allowed("add_settled_entries") && <Button type="button" size="sm" variant="outlineBlack" disabled={busy} onClick={() => onSettle(entries.filter((entry): entry is Entry => !isSettlement(entry)))} className="gap-1.5"><Check size={13}/>{t("settle")}</Button>}
      {allowed(settled ? "delete_settled_entries" : "delete_cash_flow_entries") && <Button ref={actionRef} type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setError(""); setConfirm(selectionKey); }} className="gap-1.5">{settled ? <RotateCcw size={13}/> : <Trash2 size={13}/>} {t(settled ? "reopen" : "delete")}</Button>}
    </motion.div>}
  </AnimatePresence>
  {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
 </motion.aside>}</AnimatePresence>, document.body)}
 </>;
}

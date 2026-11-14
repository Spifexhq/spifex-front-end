import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatCurrency, formatDateFromISO } from "@/lib";
import { journalDisplayId } from "@/lib/journalDisplay";
import SidePanel, { SidePanelDetails } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import type { Entry } from "@/models/entries/entries";
import type { AccountingReadiness } from "@/models/entries/accountingReadiness";
import { type FinancialEntry, isSettlement, entryDate, signedAmount, sourceEntryId, entryId, isOutstandingEntry } from "./entryRows";
import { accountingColors } from "./accountingColors";
type Details = {
    entry: FinancialEntry;
    accounting?: AccountingReadiness;
    category?: string;
    project?: string;
    entity?: string;
};
export default function EntryPreview({ entry, onClose, onEdit, onSettle, onRevert }: {
    entry: FinancialEntry | null;
    onClose(): void;
    onEdit?(entry: Entry): void;
    onSettle?(entry: Entry): void;
    onRevert?(entry: FinancialEntry): Promise<void>;
}) {
    const { t } = useTranslation("financeEntries");
    const navigate = useNavigate();
    const [details, setDetails] = useState<Details | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(""), [accountingError, setAccountingError] = useState(""), [retry, setRetry] = useState(0);
    const [reverting, setReverting] = useState(false);
    const key = entry ? entryId(entry) : "";
    useEffect(() => {
        if (!entry)
            return;
        let alive = true;
        setDetails(null);
        setLoading(true);
        setError("");
        setAccountingError("");
        void (async () => {
            try {
                const full = isSettlement(entry) ? entry : { ...entry, ...(await api.getEntry(entry.id)).data };
                const [readiness, category, project, entity] = await Promise.allSettled([api.getEntryAccountingReadiness(sourceEntryId(entry)), full.cashflow_category ? api.getCashflowCategory(full.cashflow_category) : Promise.resolve(null), full.project ? api.getProject(full.project) : Promise.resolve(null), full.entity ? api.getEntity(full.entity) : Promise.resolve(null)]);
                if (!alive)
                    return;
                const accounting = readiness.status === "fulfilled" ? readiness.value.data.accounting : !isSettlement(full) ? full.accounting || undefined : undefined;
                if (readiness.status === "rejected")
                    setAccountingError(t("accountingLoadError"));
                setDetails({ entry: full, accounting, category: category.status === "fulfilled" ? category.value?.data.name : full.cashflow_category ? t("unavailable") : undefined, project: project.status === "fulfilled" ? project.value?.data.name : full.project ? t("unavailable") : undefined, entity: entity.status === "fulfilled" ? entity.value?.data.full_name || undefined : full.entity ? t("unavailable") : undefined });
            }
            catch (cause) {
                if (alive)
                    setError(apiErrorMessage(cause, t("detailLoadError")));
            }
            finally {
                if (alive)
                    setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [entry, key, retry, t]);
    const currentDetails = details && entry && entryId(details.entry) === entryId(entry) ? details : null;
    const shown = currentDetails?.entry || entry;
    const accounting = currentDetails?.accounting;
    const status = accounting?.status;
    const editable = shown && !isSettlement(shown) ? shown : null;
    const canSettle = !!editable && isOutstandingEntry(editable);
    const revertable = !!shown && isSettlement(shown) && !!onRevert;
    return <SidePanel skeletonVariant="detail" loading={loading || (!!entry && !currentDetails && !error)} eyebrow={t("entryDetails")} isOpen={!!entry} title={entry?.description || t("entryDetails")} subtitle={t(entry && isSettlement(entry) ? "settledEntry" : "plannedEntry")} onClose={onClose} footer={editable && (onEdit || (onSettle && canSettle)) ? <>
      {onEdit && <Button variant="outline" disabled={loading || !currentDetails || !!error} onClick={() => { onClose(); onEdit(editable); }}>{t("edit")}</Button>}
      {onSettle && canSettle && <Button variant="primary" disabled={loading || !currentDetails || !!error} onClick={() => { onClose(); onSettle(editable); }}>{t("settle")}</Button>}
    </> : revertable ? <Button variant="outline" isLoading={reverting} disabled={reverting || loading || !currentDetails} onClick={() => {
      if (!shown || !onRevert) return;
      setReverting(true);
      void onRevert(shown).then(onClose).catch(cause => setError(apiErrorMessage(cause, t("detailLoadError")))).finally(() => setReverting(false));
    }}>{t("reopen")}</Button> : undefined}>
  {loading ? <p role="status" className="py-6 text-xs text-gray-500">{t("loading")}</p> : error ? <div role="alert" className="space-y-3 text-xs text-red-700"><p>{error}</p><Button size="sm" variant="outline" onClick={() => setRetry(value => value + 1)}>{t("retry")}</Button></div> : shown && <div className="space-y-6">
   <section><p className="text-xs text-gray-500">{t("amount")}</p><p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${signedAmount(shown) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatCurrency(signedAmount(shown))}</p></section>
   <SidePanelDetails fields={[
                { label: t(isSettlement(shown) ? "valueDate" : "dueDate"), value: formatDateFromISO(entryDate(shown)) },
                { label: t("balance"), value: shown.running_balance != null ? formatCurrency(Number(shown.running_balance)) : "—" },
                ...(!isSettlement(shown) ? [{ label: t("openAmount"), value: shown.open_amount != null ? formatCurrency(Number(shown.open_amount)) : "—" }] : [{ label: t("bank"), value: shown.bank?.institution || "—" }, { label: t("settledOn"), value: shown.settled_on ? formatDateFromISO(shown.settled_on.slice(0, 10)) : "—" }]),
                { label: t("category"), value: accounting?.category_name || currentDetails?.category || "—" }, { label: t("project"), value: currentDetails?.project || "—" }, { label: t("entity"), value: currentDetails?.entity || "—" },
                { label: t("installments"), value: shown.installment_count ? `${shown.installment_index || 1} / ${shown.installment_count}` : "—" },
                { label: t("observation"), value: shown.observation || "—" }, { label: t("notes"), value: shown.notes || "—" },
            ]}/>
   {!!shown.departments?.length && <section><h3 className="text-xs font-semibold text-gray-900">{t("departments")}</h3><SidePanelDetails fields={shown.departments.map(item => ({ label: item.name, value: `${item.percent}%` }))}/></section>}
   {!!shown.items?.length && <section><h3 className="text-xs font-semibold text-gray-900">{t("inventory")}</h3><SidePanelDetails fields={shown.items.map(item => ({ label: item.name, value: item.quantity }))}/></section>}
   <section className="border-t border-gray-200 pt-5"><h3 className="text-xs font-semibold text-gray-900">{t("accounting")}</h3>
    {accountingError && <div role="status" className="mt-3 flex items-center justify-between gap-2 text-xs text-amber-700"><p>{accountingError}</p><Button size="xs" variant="outline" onClick={() => setRetry(value => value + 1)}>{t("retry")}</Button></div>}
    {accounting && <><p className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-800"><span className={`h-2 w-2 rounded-full ${status ? accountingColors[status] : "bg-gray-300"}`}/>{status ? t(`statuses.${status}`) : "—"}</p>{accounting.message && <p className="mt-2 text-xs leading-5 text-gray-500">{accounting.message}</p>}<SidePanelDetails fields={[
                    { label: t("mapping"), value: accounting.ledger_account_name || "—" }, { label: t("policy"), value: typeof accounting.policy_configured === "boolean" ? t(accounting.policy_configured ? "configured" : "missing") : t("unknown") }, { label: t("bankMapping"), value: typeof accounting.bank_mapping_configured === "boolean" ? t(accounting.bank_mapping_configured ? "configured" : "missing") : t("unknown") }, { label: t("book"), value: accounting.book_code || "—" }, { label: t("journal"), value: accounting.linked_journal ? journalDisplayId(accounting.linked_journal) : "-" },
                ]}/>{accounting.next_action && <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3"><h4 className="text-xs font-medium text-gray-800">{t("nextAction")}</h4><p className="mt-1 text-xs leading-5 text-gray-500">{accounting.next_action}</p></div>}</>}
    <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/accounting/overview")}>{t("openAccounting")}</Button>
   </section>
  </div>}
 </SidePanel>;
}

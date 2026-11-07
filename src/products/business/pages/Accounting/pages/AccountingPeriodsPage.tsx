import { useAccountingSource } from "@/products/business/hooks/useAccountingRecords";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import { useAuthContext } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/core/api/requests";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import DataTable from "@/shared/ui/DataTable";
import AccountingStatus from "../components/AccountingStatus";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import DataTableSkeleton from "@/shared/ui/DataTable/DataTableSkeleton";
import { fetchAllCursor } from "@/lib/list";
import type { FiscalPeriod } from "@/models/settings/accountingSetup";
import type { AccountingBook } from "@/models/settings/accounting";
import { useAccountingDraft, useAccountingSetup } from "../setup/useAccountingSetup";

const empty = { book_id: "", period_key: "", starts_at: "", ends_at: "" };
export default function AccountingPeriodsPage() {
  const { t } = useTranslation("accountingSettings");
  const { isOwner, isSuperUser, permissions } = useAuthContext();
  const canDelete = isOwner || isSuperUser || permissions.includes("delete_ledger_account");
  const { canManage, status } = useAccountingSetup();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [books, setBooks] = useState<AccountingBook[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FiscalPeriod | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useAccountingDraft("fiscal-period", empty);
  const [transition, setTransition] = useState<{ period: FiscalPeriod; status: FiscalPeriod["status"] } | null>(null);
  const source = useAccountingSource<FiscalPeriod>("periods");
  const recordFilters = useRecordFilters(periods, [
 {key:"status",label:t("table.status"),value:item=>item.status,format:value=>t(`setupFlow.periodStates.${value}`)},
 {key:"book",label:t("nav.books"),value:item=>item.book,format:value=>books.find(book=>book.id===value)?.name||"—"},
 {key:"from",label:t("filters.dateFrom"),value:item=>item.starts_at,date:"from"},
 {key:"to",label:t("filters.dateTo"),value:item=>item.ends_at,date:"to"}
], item=>[item.period_key,books.find(book=>book.id===item.book)?.name].join(" "), { ...source, placeholder: t("filters.search.periods"), onItems: setPeriods });
  const loading = recordFilters.pager.loading;
  const load = recordFilters.pager.refresh;
  useEffect(() => { void fetchAllCursor<AccountingBook>(params => api.getAccountingBooks(params)).then(setBooks).catch(cause => setError(apiErrorMessage(cause, ""))); }, []);

  const save = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (editing) await api.editFiscalPeriod(editing.id, { period_key: form.period_key, starts_at: form.starts_at, ends_at: form.ends_at });
      else await api.addFiscalPeriod({ ...form, status: "open" });
      setOpen(false); setEditing(null); setForm(empty); await load();
    }
    catch (cause) { setError(apiErrorMessage(cause, t("setupFlow.actionError"))); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><p className="max-w-2xl text-xs leading-6 text-gray-500">{t("setupFlow.periodGuidance")}</p>{canManage && <Button onClick={() => { setEditing(null); setForm(previous => ({ ...previous, book_id: previous.book_id || status?.primary_book_id || "" })); setOpen(true); }}>{t("setupFlow.newPeriod")}</Button>}</div>
    {error !== null && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">{error || t("setupFlow.actionError")}</p>}
    {recordFilters.pager.error && <p role="alert" className="text-sm text-red-700">{recordFilters.pager.error}</p>}{recordFilters.filters}
    {loading && !periods.length ? <DataTableSkeleton rows={5} /> : <DataTable pager={recordFilters.pager} items={recordFilters.rows} editLabel={t("common.edit")} emptyLabel={t("setupFlow.noPeriods")} columns={[
{ key: "name", label: t("setupFlow.periodName"), render: item => item.period_key },
{ key: "book", label: t("nav.books"), render: item => books.find(book => book.id === item.book)?.name || item.book },
{ key: "start", label: t("setupFlow.startDate"), render: item => item.starts_at },
{ key: "end", label: t("setupFlow.endDate"), render: item => item.ends_at },
{ key: "status", label: t("table.status"), render: item => <AccountingStatus active={item.status === "open"} label={t(`setupFlow.periodStates.${item.status}`)} /> }
]} actions={canManage ? item => <div className="flex gap-1">{!item.has_journals && <Button size="sm" variant="outline" onClick={() => { setEditing(item); setForm({ book_id: item.book, period_key: item.period_key, starts_at: item.starts_at, ends_at: item.ends_at }); setOpen(true); }}>{t("common.edit")}</Button>}{(["open", "soft_closed", "closed"] as const).filter(value => value !== item.status).map(value => <Button size="sm" variant="outline" key={value} onClick={() => setTransition({ period: item, status: value })}>{t(`setupFlow.periodTransitions.${value}`)}</Button>)}</div> : undefined} onDelete={canDelete ? async item => { await api.deleteFiscalPeriod(item.id); setPeriods(previous => previous.filter(row => row.id !== item.id)); await load(); } : undefined} />}
    <SidePanel isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title={t(editing ? "setupFlow.editPeriod" : "setupFlow.newPeriod")}>
      <SidePanelForm className="space-y-5" onSubmit={event => { event.preventDefault(); void save(); }}>
        <Select disabled={!!editing || busy} label={t("nav.books")} items={books.filter(book => book.is_active)} selected={books.filter(book => book.id === form.book_id)} onChange={items => setForm(previous => ({ ...previous, book_id: items[0]?.id || "" }))} getItemKey={book => book.id} getItemLabel={book => `${book.name} · ${book.currency_code}`} singleSelect hideCheckboxes />
        <Input kind="text" label={t("setupFlow.periodName")} value={form.period_key} onChange={event => setForm(previous => ({ ...previous, period_key: event.target.value }))} required />
        <div className="grid gap-4 sm:grid-cols-2"><Input kind="date" label={t("setupFlow.startDate")} value={form.starts_at} onValueChange={value => setForm(previous => ({ ...previous, starts_at: value }))} /><Input kind="date" label={t("setupFlow.endDate")} value={form.ends_at} onValueChange={value => setForm(previous => ({ ...previous, ends_at: value }))} /></div>
        <p className="text-xs leading-6 text-gray-500">{t("setupFlow.periodConsequences")}</p>
        {error !== null && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="cancel" disabled={busy} onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={busy || !form.book_id || !form.starts_at || !form.ends_at || form.ends_at < form.starts_at}>{t("common.save")}</Button></div>
      </SidePanelForm>
    </SidePanel>
    <ConfirmToast open={!!transition} busy={busy} text={t("setupFlow.periodConsequences")} onCancel={() => setTransition(null)} confirmLabel={t("common.save")} cancelLabel={t("common.cancel")} onConfirm={() => {
      if (!transition || busy) return;
      setBusy(true);
      void api.updateFiscalPeriod(transition.period.id, transition.status).then(() => { setTransition(null); return load(); }).catch(cause => { setError(apiErrorMessage(cause, t("setupFlow.actionError"))); }).finally(() => setBusy(false));
    }} />
  </section>;
}

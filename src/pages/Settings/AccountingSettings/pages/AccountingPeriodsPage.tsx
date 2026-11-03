import { accountingErrorMessage } from "../accountingError";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/requests";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import SettingsTable from "@/shared/ui/Settings/SettingsTable";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { fetchAllCursor } from "@/lib/list";
import type { FiscalPeriod } from "@/models/settings/accountingSetup";
import type { AccountingBook } from "@/models/settings/accounting";
import { useAccountingDraft, useAccountingSetup } from "../setup/useAccountingSetup";

const empty = { book_id: "", period_key: "", starts_at: "", ends_at: "" };
export default function AccountingPeriodsPage() {
  const { t } = useTranslation("accountingSettings");
  const { canManage, status } = useAccountingSetup();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [books, setBooks] = useState<AccountingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FiscalPeriod | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useAccountingDraft("fiscal-period", empty);
  const [transition, setTransition] = useState<{ period: FiscalPeriod; status: FiscalPeriod["status"] } | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [response, books] = await Promise.all([api.getFiscalPeriods(), fetchAllCursor<AccountingBook>(params => api.getAccountingBooks(params))]);
      setPeriods(response.data); setBooks(books);
    } catch (cause) { setError(accountingErrorMessage(cause, "")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (editing) await api.editFiscalPeriod(editing.id, { period_key: form.period_key, starts_at: form.starts_at, ends_at: form.ends_at });
      else await api.addFiscalPeriod({ ...form, status: "open" });
      setOpen(false); setEditing(null); setForm(empty); await load();
    }
    catch (cause) { setError(accountingErrorMessage(cause, t("setupFlow.actionError"))); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><p className="max-w-2xl text-xs leading-6 text-gray-500">{t("setupFlow.periodGuidance")}</p>{canManage && <Button onClick={() => { setEditing(null); setForm(previous => ({ ...previous, book_id: previous.book_id || status?.primary_book_id || "" })); setOpen(true); }}>{t("setupFlow.newPeriod")}</Button>}</div>
    {error !== null && <p role="alert" className="accounting-notice">{error || t("setupFlow.actionError")}</p>}
    {loading ? <PageSkeleton rows={5} /> : <SettingsTable><thead><tr><th>{t("setupFlow.periodName")}</th><th>{t("nav.books")}</th><th>{t("setupFlow.startDate")}</th><th>{t("setupFlow.endDate")}</th><th>{t("setupFlow.periodStatus")}</th><th>{t("setupFlow.periodActions")}</th></tr></thead><tbody>{periods.map(period => <tr key={period.id}><td>{period.period_key}</td><td>{books.find(book => book.id === period.book)?.name || period.book}</td><td>{period.starts_at}</td><td>{period.ends_at}</td><td>{t(`setupFlow.periodStates.${period.status}`)}</td><td>{canManage && <div className="flex flex-wrap gap-2">{!period.has_journals && <Button size="sm" variant="outline" onClick={() => { setEditing(period); setForm({ book_id: period.book, period_key: period.period_key, starts_at: period.starts_at, ends_at: period.ends_at }); setOpen(true); }}>{t("common.edit")}</Button>}{(["open", "soft_closed", "closed"] as const).filter(value => value !== period.status).map(value => <Button size="sm" variant="outline" key={value} onClick={() => setTransition({ period, status: value })}>{t(`setupFlow.periodTransitions.${value}`)}</Button>)}</div>}</td></tr>)}{!periods.length && <tr><td colSpan={6}>{t("setupFlow.noPeriods")}</td></tr>}</tbody></SettingsTable>}
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
      void api.updateFiscalPeriod(transition.period.id, transition.status).then(() => { setTransition(null); return load(); }).catch(cause => { setError(accountingErrorMessage(cause, t("setupFlow.actionError"))); }).finally(() => setBusy(false));
    }} />
  </section>;
}

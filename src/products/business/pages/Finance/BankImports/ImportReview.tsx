import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCheck, Clock3, ListChecks, X } from "lucide-react";
import { api } from "@/core/api/requests";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { StatementImportSession, StatementImportLookups, StatementImportRow } from "@/models/finance/imports";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import DataTable from "@/shared/ui/DataTable";
import Input from "@/shared/ui/Input";
import MetricCard from "@/shared/ui/MetricCard";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import SelectionBar from "@/shared/ui/SelectionBar";
import { ErrorState } from "@/shared/ui/State";
import LookupSelect from "./LookupSelect";
import ImportRowEditor from "./ImportRowEditor";
import { ImportStatus } from "./ImportHistory";

export default function ImportReview({ sessionId, canEdit }: { sessionId: string; canEdit: boolean }) {
  const { t, i18n } = useTranslation("statements");
  const [session, setSession] = useState<StatementImportSession>(), [lookups, setLookups] = useState<StatementImportLookups>();
  const [row, setRow] = useState<StatementImportRow>(), [editorOpen, setEditorOpen] = useState(false), [status, setStatus] = useState(""), [search, setSearch] = useState(""), [query, setQuery] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false), [retry, setRetry] = useState(0), [bulkCategory, setBulkCategory] = useState("");
  const [clearSelection, setClearSelection] = useState(0), [notice, setNotice] = useState("");
  const mutation = useRef(false);
  const pager = useCursorPager<StatementImportRow>(async (cursor, page_size) => {
    const data = await api.getStatementImportRows(sessionId, { cursor, page_size, include_count: true, status, q: query });
    return { items: data.results, nextCursor: getCursorFromUrl(data.next), totalCount: data.count };
  }, { deps: [sessionId, status, query] });
  useEffect(() => {
    let alive = true;
    setError("");
    void Promise.all([api.getStatementImportSession(sessionId), api.getStatementImportLookups(sessionId)]).then(([metadata, options]) => { if (alive) { setSession(metadata); setLookups(options); } }).catch(cause => { if (alive) setError(apiErrorMessage(cause, t("workspace.error"))); });
    return () => { alive = false; };
  }, [sessionId, retry, t]);
  const refresh = async () => { const metadata = await api.getStatementImportSession(sessionId); setSession(metadata); await pager.refresh(); };
  const run = async (action: () => Promise<unknown>) => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); await refresh(); setClearSelection(value => value + 1); }
    catch (cause) { setError(apiErrorMessage(cause, t("workspace.error"))); }
    finally { mutation.current = false; setBusy(false); }
  };
  if (!session || !lookups) return error ? <ErrorState message={error} action={<Button variant="outline" onClick={() => setRetry(value => value + 1)}>{t("workspace.retry")}</Button>} /> : <PageSkeleton variant="review" />;
  const committed = session.status === "committed", editable = canEdit && !committed;
  const summary = session.summary;
  const counts = [
    { key: "total", value: summary.total_rows, Icon: ListChecks },
    { key: "pending", value: summary.pending_rows, Icon: Clock3 },
    { key: "ready", value: summary.ready_rows, Icon: CheckCheck },
    { key: "excluded", value: summary.excluded_rows, Icon: Ban },
  ];
  return <section className="space-y-5" aria-busy={busy}>
    <Card as="section" radius="xl" tone="slate" padding="compact">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h2 className="text-sm font-semibold text-slate-900">{t(committed ? "workspace.completed" : "workspace.reviewTitle")}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{t(committed ? "workspace.completedHelp" : "workspace.reviewHelp")}</p></div>
        {editable && <Button variant="primary" disabled={busy || !!summary.pending_rows || !summary.ready_rows} onClick={() => setConfirm(true)}>{t("workspace.create", { count: summary.ready_rows || 0 })}</Button>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{counts.map(item => <MetricCard key={item.key} label={t(`workspace.counts.${item.key}`)} value={item.value || 0} Icon={item.Icon} />)}</div>
    </Card>
    {summary.ai_failed && !committed && <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{t("workspace.suggestionsUnavailable")}</div>}
    {error && <ErrorState message={error} />}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <Card as="section" radius="xl" tone="slate" padding="compact">
      <div className="flex flex-wrap items-end gap-3">
        <form className="min-w-40 max-w-xs flex-1" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); }}><Input size="sm" aria-label={t("workspace.searchTransactions")} placeholder={t("workspace.searchTransactions")} value={search} onChange={event => { setSearch(event.target.value); if (!event.target.value) setQuery(""); }} /></form>
        <div className="w-40"><LookupSelect label={t("workspace.status")} items={["pending", "ready", "excluded", "created"].map(id => ({ id, label: t(`workspace.states.${id}`) }))} value={status} onChange={setStatus} /></div>
        {status && <Button variant="ghost" size="sm" onClick={() => setStatus("")}>{t("workspace.clear")}</Button>}
        {editable && <Button variant="outline" size="sm" disabled={busy || !summary.high_confidence_rows} onClick={() => void run(async () => { const result = await api.acceptConfidentStatementImportRows(sessionId); setNotice(t("workspace.accepted", { count: result.accepted })); })}>{t("workspace.acceptConfirmed")}</Button>}
      </div>
    </Card>
    <Card as="section" radius="xl" tone="slate" padding="none" className="overflow-hidden">
      <DataTable<StatementImportRow> items={pager.items} pager={pager} busy={pager.loading || busy} error={pager.error} canEdit={editable} editLabel={t("workspace.review")} getRowName={item => item.source_description} onInspect={next => { setRow(next); setEditorOpen(true); }} onEdit={next => { setRow(next); setEditorOpen(true); }} emptyLabel={t("workspace.noTransactions")} selectable={editable} canSelect={editable} clearSelectionToken={clearSelection} className="rounded-none! border-0!"
        columns={[
          { key: "name", label: t("workspace.description"), render: item => <div className="min-w-0"><span className="font-medium">{item.final_description || item.source_description}</span>{item.duplicate_confidence >= .8 && <span className="ml-2 text-xs text-amber-700">{t("workspace.duplicate")}</span>}</div> },
          { key: "date", label: t("workspace.date"), render: item => item.final_due_date || item.source_date || t("workspace.notSet") },
          { key: "amount", label: t("workspace.amount"), render: item => <span className="whitespace-nowrap tabular-nums">{item.final_tx_type === -1 ? "−" : "+"}{item.final_amount_minor == null ? t("workspace.notSet") : (item.final_amount_minor / 100).toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
          { key: "category", label: t("workspace.category"), render: item => item.cashflow_category?.label || <span className="text-slate-400">{lookups.cashflow_categories.find(option => option.id === item.candidate_payload?.suggested_category_id)?.label || t("workspace.chooseCategory")}</span> },
          { key: "status", label: t("workspace.status"), render: item => <ImportStatus status={item.status} /> },
        ]}
        selectionActions={selection => <SelectionBar open={editable && selection.ids.length > 0} label={t("workspace.selected", { count: selection.ids.length })} className="max-w-3xl" layout>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-gray-900">{t("workspace.selected", { count: selection.ids.length })}</p>
            <button type="button" disabled={busy} aria-label={t("workspace.clear")} title={t("workspace.clear")} onClick={selection.clear} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-800"><X size={15} aria-hidden="true" /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-end gap-2 border-t border-gray-100 pt-3">
            <div className="min-w-48 max-w-xs flex-1"><LookupSelect label={t("workspace.category")} hideLabel value={bulkCategory} items={lookups.cashflow_categories} onChange={setBulkCategory} disabled={busy} /></div>
            <Button size="sm" variant="primary" disabled={busy || !bulkCategory} onClick={() => void run(() => api.bulkUpdateStatementImportRows(sessionId, { ids: selection.ids, data: { cashflow_category_id: bulkCategory, status: "ready" } }))}>{t("workspace.apply")}</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => api.bulkUpdateStatementImportRows(sessionId, { ids: selection.ids, data: { status: "excluded" } }))}>{t("workspace.exclude")}</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={selection.clear}>{t("workspace.cancel")}</Button>
          </div>
        </SelectionBar>} />
      <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-400">{t("workspace.savedHelp")}</p>
    </Card>
    {row && <ImportRowEditor isOpen={editorOpen} key={row.id} row={row} sessionId={sessionId} lookups={lookups} readOnly={!editable} onClose={() => setEditorOpen(false)} onSaved={refresh} />}
    <ConfirmToast open={confirm} text={t("workspace.confirm", { count: summary.ready_rows || 0 })} confirmLabel={t("workspace.create", { count: summary.ready_rows || 0 })} cancelLabel={t("workspace.cancel")} busy={busy} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void run(async () => { const result = await api.commitStatementImportSession(sessionId); setNotice(t("workspace.created", { count: result.created_count })); }); }} />
  </section>;
}

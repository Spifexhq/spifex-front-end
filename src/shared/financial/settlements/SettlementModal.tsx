import SegmentedControl from "@/shared/ui/SegmentedControl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import FloatingDialog, { DialogSkeleton } from "@/components/Modal/FloatingDialog";
import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { BankAccount } from "@/models/settings/banking";
import type { SettlementSource } from "@/models/entries/settlements";
import { useSettlementDraft } from "./useSettlementDraft";
import { applySettlementDate, applyPercentage, bankSummary, cents, draftIssue, localToday, settlementPayload, type SettlementDraft } from "./settlementDraft";

export type SettlementTarget = { id: string };
type SettlementAdapter = {
  loadDrafts(ids: string[]): Promise<SettlementSource[]>;
  settle(items: ReturnType<typeof settlementPayload>, atomic: boolean): Promise<{ errors?: unknown[] }>;
};
type Props = { isOpen: boolean; onClose(): void; onSave(): void; selectedEntries: SettlementTarget[]; banksData: { banks: BankAccount[]; loading: boolean; error: string | null }; onRetryBanks?(): void; adapter?: SettlementAdapter };
const PAGE_SIZE = 20;
export default function SettlementModal({ isOpen, onClose, onSave, selectedEntries, banksData, onRetryBanks, adapter }: Props) {
  const { t } = useTranslation("settlementModal");
  const draft = useSettlementDraft(isOpen, selectedEntries, adapter?.loadDrafts);
  const { rows, setRows } = draft;
  const banks = useMemo(() => banksData.banks.filter(bank => bank.is_active !== false).sort((a,b) => a.institution.localeCompare(b.institution)), [banksData.banks]);
  const [tab, setTab] = useState<"prepare" | "review">("prepare"), [search, setSearch] = useState(""), [filter, setFilter] = useState("all"), [page, setPage] = useState(0);
  const [bankId, setBankId] = useState(""), [date, setDate] = useState(localToday), [percent, setPercent] = useState("50");
  const [dateMode, setDateMode] = useState<"custom" | "due">("custom");
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<SettlementDraft | null>(null);
  const submitting = useRef(false), formRef = useRef<HTMLFormElement>(null), alertRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => rows.filter(row => (!search || `${row.description} ${row.dueDate}`.toLowerCase().includes(search.toLowerCase())) && (filter === "all" || (filter === "issues" ? Boolean(draftIssue(row,banks)) : filter === "unassigned" ? !row.bankId : row.tx === filter))), [rows, search, filter, banks]);
  const selection = useShiftSelect(filtered, row => row.id);
  const checked = new Set(selection.selectedIds);
  const resetSelection = useRef(selection.clearSelection); resetSelection.current = selection.clearSelection;
  const target = selection.selectedIds.length ? rows.filter(row => checked.has(row.id)) : filtered;
  const pageIndex = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE)-1));
  const visible = filtered.slice(pageIndex * PAGE_SIZE, (pageIndex+1) * PAGE_SIZE);
  const issues = rows.filter(row => draftIssue(row, banks));
  const partials = rows.filter(row => (cents(row.amount) ?? 0n) < (cents(row.remaining) ?? 0n)).length;
  const chosen = banks.find(bank => bank.id === bankId) ?? (banks.length === 1 ? banks[0] : undefined);
  const loading = draft.loading || banksData.loading;
  const invalid = loading || draft.error || Boolean(banksData.error) || !rows.length || issues.length > 0;
  const close = useCallback(() => { if (submitting.current) return; if (dirty) setDiscard(true); else onClose(); }, [dirty,onClose]);
  useEffect(() => { if (!isOpen) return; setTab("prepare"); setSearch(""); setFilter("all"); setPage(0); setDirty(false); setDiscard(false); setError(null); setRemoved(null); setBankId(""); setDate(localToday()); setDateMode("custom"); setPercent("50"); resetSelection.current(); }, [isOpen]);
  useEffect(() => { setPage(0); }, [search,filter]);
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!isOpen) return;
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('[data-select-open="true"],[data-popover-open="true"]')) return;
      if (event.key === "Escape") { event.preventDefault(); if (discard) setDiscard(false); else close(); }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !discard && !submitting.current) { event.preventDefault(); formRef.current?.requestSubmit(); }
    };
    document.addEventListener("keydown",key);
    return () => document.removeEventListener("keydown",key);
  }, [isOpen, close, discard]);
  const edit = (id: string, changes: Partial<SettlementDraft>) => { setRows(previous => previous.map(row => row.id === id ? {...row,...changes} : row)); setDirty(true); setError(null); };
  const apply = (change: (row: SettlementDraft) => SettlementDraft) => { const ids = new Set(target.map(row => row.id)); setRows(previous => previous.map(row => ids.has(row.id) ? change(row) : row)); setDirty(true); setError(null); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || loading || discard) return;
    if (tab === "prepare") { setTab("review"); return; }
    if (invalid) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const payload = settlementPayload(rows,banks);
      const result = adapter ? await adapter.settle(payload, true) : (await api.addSettlementsBulk(payload, true)).data;
      if ("errors" in result && result.errors?.length) throw new Error(t("batch.failed"));
      setDirty(false); onSave();
    } catch (cause) { setError(apiErrorMessage(cause,t("batch.failed"))); }
    finally { submitting.current = false; setBusy(false); }
  };
  const bankLabel = (bank: BankAccount) => `${bank.institution} · ${bank.account_number || bank.iban || bank.branch || bank.account_type} · ${bank.currency}`;
  const bankSelect = (value: BankAccount | undefined, change: (id: string) => void, label: string) => <Select<BankAccount> label={label} items={banks} selected={value ? [value] : []} onChange={items => change(items[0]?.id || "")} getItemKey={bank => bank.id} getItemLabel={bankLabel} buttonLabel={t("footer.selectBank")} singleSelect size="sm" virtualize />;
  return <FloatingDialog isOpen={isOpen} title={t("batch.title",{count:rows.length || selectedEntries.length})} eyebrow={t("header.kind")} description={t("batch.intro")} width={1080} height={760} onClose={close} closeLabel={t("actions.close")} onSubmit={submit} formRef={formRef} busy={busy} loading={loading}
    tabs={<div role="tablist" aria-label={t("header.kind")} className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">{(["prepare","review"] as const).map((value,i) => <button key={value} id={`settlement-${value}`} type="button" role="tab" aria-selected={tab===value} aria-controls="settlement-panel" tabIndex={tab===value ? 0 : -1} disabled={busy} onClick={()=>setTab(value)} onKeyDown={event=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(event.key)){event.preventDefault();const next=event.key==="Home"?"prepare":event.key==="End"?"review":value==="prepare"?"review":"prepare";setTab(next);document.getElementById(`settlement-${next}`)?.focus();}}} className="min-h-10 flex-1 rounded-md border border-transparent px-3 text-xs font-medium text-slate-500 aria-selected:border-slate-200 aria-selected:bg-white aria-selected:text-slate-800 sm:min-h-8">{i+1}. {t(`batch.${value}`)}</button>)}</div>}
    footer={<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{t("batch.progress",{count:rows.length,ready:rows.length-issues.length})}</p><div className="ml-auto flex max-w-full flex-wrap justify-end gap-2">{tab==="review" && <Button type="button" variant="outline" className="hidden sm:inline-flex" disabled={busy} onClick={()=>setTab("prepare")}>{t("batch.back")}</Button>}<Button type="button" variant="cancel" disabled={busy} onClick={close}>{t("actions.cancel")}</Button>{tab==="prepare" ? <Button type="button" disabled={loading || draft.error || !rows.length || Boolean(banksData.error)} onClick={()=>setTab("review")}>{t("batch.review")}</Button> : <Button type="submit" disabled={invalid || busy}>{busy?t("batch.saving"):t("batch.confirm",{count:rows.length})}</Button>}</div></div>}
    overlay={discard ? <div role="alertdialog" aria-modal="true" aria-labelledby="settlement-discard-title" className="absolute inset-0 z-20 grid place-items-center bg-slate-950/20 p-4"><div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"><h3 id="settlement-discard-title" className="text-sm font-semibold">{t("batch.discardTitle")}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{t("batch.discardText")}</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setDiscard(false)}>{t("batch.keep")}</Button><Button type="button" variant="danger" onClick={onClose}>{t("batch.discard")}</Button></div></div></div> : undefined}>
    {loading ? <DialogSkeleton fields={7} label={t("batch.loading")} /> : draft.error || banksData.error ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>{draft.error?t("batch.loadError"):banksData.error}</p><Button type="button" className="mt-3" variant="outline" onClick={()=>{if(draft.error) draft.retry();onRetryBanks?.();}}>{t("batch.retry")}</Button></div> : <div id="settlement-panel" role="tabpanel" aria-labelledby={`settlement-${tab}`} className="space-y-4 [&_button]:min-h-11 [&_input:not([type=checkbox])]:min-h-11 sm:[&_button]:min-h-8 sm:[&_input:not([type=checkbox])]:min-h-8">
      {error && <div ref={alertRef} tabIndex={-1} role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">{error}<p>{t("batch.retained")}</p><Button type="button" variant="outline" className="mt-2" onClick={()=>{draft.refreshBalances();onRetryBanks?.();setError(null);setTab("prepare");}}>{t("batch.reloadBalances")}</Button></div>}
      {tab==="prepare" ? <>
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"><p className="mb-3 text-xs font-medium text-slate-600">{t("batch.applyTo",{count:target.length})}</p><div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">{bankSelect(chosen,setBankId,t("banks.title"))}<Button type="button" variant="outline" disabled={!chosen || !target.length} onClick={()=>apply(row=>({...row,bankId:chosen!.id}))}>{t("batch.assignBank")}</Button><div className="space-y-2"><p className="text-xs font-medium text-slate-600">{t("batch.date")}</p><SegmentedControl<"custom" | "due"> value={dateMode} onChange={setDateMode} label={t("batch.date")} items={[{value:"custom",label:t("batch.customDate")},{value:"due",label:t("batch.useDueDate")}]}/>{dateMode === "custom" ? <Input kind="date" size="sm" value={date} onValueChange={setDate} aria-label={t("batch.date")}/> : <p className="text-[11px] leading-5 text-slate-500">{t("batch.dueDateHelp")}</p>}</div><Button type="button" variant="outline" disabled={(dateMode === "custom" && !date) || !target.length} onClick={()=>apply(row=>applySettlementDate(row,dateMode,date))}>{t("actions.bulkDate")}</Button></div><details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">{t("batch.partialTools")}</summary><div className="mt-3 flex flex-wrap items-end gap-2"><div className="w-28"><Input kind="text" size="sm" inputMode="decimal" label={t("batch.percent")} value={percent} onChange={event=>setPercent(event.target.value.replace(",","."))}/></div><Button type="button" variant="outline" disabled={!target.length || (cents(percent)??0n)<=0n || (cents(percent)??0n)>10000n} onClick={()=>apply(row=>applyPercentage(row,percent))}>{t("batch.applyPercent")}</Button><Button type="button" variant="outline" disabled={!target.length} onClick={()=>apply(row=>({...row,amount:row.remaining}))}>{t("batch.full")}</Button></div></details><p className="mt-3 text-[11px] leading-5 text-slate-400">{t("batch.selectionHelp")}</p></div>
        <div className="grid gap-2 sm:grid-cols-[1fr_220px]"><Input kind="text" size="sm" aria-label={t("batch.search")} placeholder={t("batch.search")} value={search} onChange={event=>setSearch(event.target.value)}/><Select<{id:string;label:string}> items={["all","unassigned","credit","debit","issues"].map(id=>({id,label:t(`batch.filter.${id}`)}))} selected={[{id:filter,label:t(`batch.filter.${filter}`)}]} onChange={items=>setFilter(items[0]?.id||"all")} getItemKey={item=>item.id} getItemLabel={item=>item.label} singleSelect hideFilter size="sm" /></div>
        {removed && <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500"><span>{t("batch.removed")}</span><Button type="button" size="sm" variant="outline" onClick={()=>{setRows(previous=>[...previous,removed]);setRemoved(null);}}>{t("batch.undo")}</Button></div>}
        <section className="overflow-hidden rounded-lg border border-slate-200"><div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><Checkbox checked={filtered.length>0 && filtered.every(row=>checked.has(row.id))} indeterminate={filtered.some(row=>checked.has(row.id)) && !filtered.every(row=>checked.has(row.id))} onChange={()=>selection.setSelectedIds(filtered.every(row=>checked.has(row.id))?selection.selectedIds.filter(id=>!filtered.some(row=>row.id===id)):[...new Set([...selection.selectedIds,...filtered.map(row=>row.id)])])} aria-label={t("batch.selectMatching")}/><span>{t("batch.matching",{count:filtered.length,selected:selection.selectedIds.length})}</span>{selection.selectedIds.length>0 && <button type="button" className="ml-auto min-h-8 underline" onClick={selection.clearSelection}>{t("batch.clear")}</button>}</div>
          <div className="divide-y divide-slate-100">{visible.map(row=>{const issue=draftIssue(row,banks);return <div key={row.id} className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-center"><div className="flex items-start gap-3"><Checkbox checked={checked.has(row.id)} onClick={event=>selection.handleSelectRow(row.id,event)} aria-label={t("batch.selectEntry",{name:row.description})}/><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-800">{row.description||t("batch.untitled")}</p><p className="mt-1 text-[11px] text-slate-500">{formatDateFromISO(row.dueDate)} · {t(row.tx==="credit"?"batch.incoming":"batch.outgoing")} · {t("batch.remaining")} {formatCurrency(row.remaining)}</p></div><button type="button" aria-label={t("batch.remove")} className="grid size-11 shrink-0 place-items-center rounded sm:size-9 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={()=>{setRows(previous=>previous.filter(item=>item.id!==row.id));selection.setSelectedIds(previous=>previous.filter(id=>id!==row.id));setRemoved(row);setDirty(true);}}><X size={15} aria-hidden="true" /></button></div><div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">{bankSelect(banks.find(bank=>bank.id===row.bankId),id=>edit(row.id,{bankId:id}),t("banks.title"))}<Input kind="date" size="sm" label={t("batch.date")} value={row.date} onValueChange={(value: string)=>edit(row.id,{date:value})}/><Input kind="amount" size="sm" label={t("batch.payAmount")} value={row.amount} onValueChange={(value: string)=>edit(row.id,{amount:value})}/></div>{issue && <p className="text-[11px] text-amber-700 lg:col-span-2">{t(`batch.issue.${issue}`)}</p>}</div>;})}{!visible.length && <p className="p-6 text-center text-xs text-slate-400">{t("batch.noMatches")}</p>}</div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500"><span>{t("batch.pageRange",{start:pageIndex*PAGE_SIZE+(visible.length?1:0),end:pageIndex*PAGE_SIZE+visible.length,count:filtered.length})}</span><div className="flex gap-1"><Button type="button" size="sm" variant="outline" disabled={!pageIndex} aria-label={t("batch.previous")} onClick={()=>setPage(pageIndex-1)}><ChevronLeft size={15} aria-hidden="true" /></Button><Button type="button" size="sm" variant="outline" disabled={(pageIndex+1)*PAGE_SIZE>=filtered.length} aria-label={t("batch.next")} onClick={()=>setPage(pageIndex+1)}><ChevronRight size={15} aria-hidden="true" /></Button></div></div>
        </section>
      </> : <><div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">{t("batch.reviewTitle",{count:rows.length})}</p><p className="mt-2 text-xs leading-5 text-slate-500">{t("batch.reviewHelp",{count:partials})}</p></div>{issues.length>0 && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p>{t("batch.resolve",{count:issues.length})}</p><Button type="button" className="mt-2" variant="outline" onClick={()=>{setFilter("issues");setSearch("");setTab("prepare");selection.clearSelection();}}>{t("batch.showIssues")}</Button></div>}{banks.map(bank=>{const group=bankSummary(rows,bank.id);return group.count>0 && <section key={bank.id} className="rounded-lg border border-slate-200 p-4"><h3 className="text-xs font-semibold text-slate-800">{bankLabel(bank)}</h3><p className="mt-1 text-[11px] text-slate-400">{t("batch.entriesCount",{count:group.count})}</p><div className="mt-4 grid grid-cols-3 gap-3">{([['incoming',group.incoming],['outgoing',group.outgoing],['net',group.net]] as const).map(([label,value])=><div key={label}><p className="text-[11px] text-slate-500">{t(`batch.${label}`)}</p><p className="mt-1 break-words text-sm font-semibold tabular-nums text-slate-800">{formatCurrency(value,bank.currency)}</p></div>)}</div></section>;})}</>}
    </div>}
  </FloatingDialog>;
}

import TransactionAttachments from "./TransactionAttachments";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import FloatingDialog, { DialogSkeleton } from "@/components/Modal/FloatingDialog";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import ToggleSwitch from "@/shared/ui/ToggleSwitch";
import { ErrorState } from "@/shared/ui/State";
import { Select } from "@/shared/ui/Select";
import { personalApi } from "@/products/personal/services/api";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { PersonalAccount, PersonalCategory, PersonalCollection, PersonalRecord } from "@/products/personal/types";
import type { RecurrenceEntry } from "@/models/entries/entries";
import { allPersonal, today } from "../services/personalData";

type DialogKind = Exclude<PersonalCollection, "accounts" | "transfers"> | "settle" | "contribute" | "transfer";
type Props = { kind: DialogKind; record?: PersonalRecord | null; currency: string; transactionKind?: "income" | "expense"; onClose(): void; onSaved(): void };

export default function PersonalRecordDialog({ kind, record, currency, transactionKind, onClose, onSaved }: Props) {
  const { t } = useTranslation("personal");
  const editLocked = kind === "transactions" && !!record && "status" in record && record.status !== "pending";
  const [form, setForm] = useState<Record<string, string>>(() => ({
    name: "", description: "", amount: kind === "settle" && record && "open_amount" in record ? record.open_amount : "",
    kind: transactionKind || "expense", due_date: today(), value_date: today(), month: today().slice(0, 7) + "-01",
    category_id: "", bank_id: "", notes: "",
    limit: "", target: "", target_date: "", recurrence_enabled: "false", installment_count: "2", interval_months: "1", weekend_action: "0",
    ...(kind === "settle" || kind === "contribute" ? {} : Object.fromEntries(Object.entries(record || {}).map(([key, value]) => [key, value == null ? "" : String(value)]))),
  }));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [categories, setCategories] = useState<PersonalCategory[]>([]);
  const [series, setSeries] = useState<{ loading: boolean; error: string; rows: RecurrenceEntry[] }>({ loading: false, error: "", rows: [] });
  const [scope, setScope] = useState<"single" | "selected">("single");
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [seriesRetry, setSeriesRetry] = useState(0);
  const key = useRef(crypto.randomUUID());
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setOptionsFailed(false);
    setError("");
    void Promise.all([
      kind === "transfer" ? allPersonal<PersonalAccount>("accounts") : Promise.resolve([]),
      (kind === "budgets" || (kind === "transactions" && !editLocked)) ? allPersonal<PersonalCategory>("categories") : Promise.resolve([]),
    ]).then(([bankRows, categoryRows]) => {
      if (active) {
        setAccounts(bankRows.filter(item => item.is_active));
        setCategories(categoryRows.filter(item => item.is_active));
      }
    }).catch(cause => {
      if (active) { setOptionsFailed(true); setError(apiErrorMessage(cause, t("optionsError"))); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, record, editLocked, retry, t]);

  const recurrenceCount = kind === "transactions" && record && "installment_count" in record ? record.installment_count : 0;
  useEffect(() => {
    if (kind !== "transactions" || !record || recurrenceCount <= 1) {
      setSeries({ loading: false, error: "", rows: [] });
      setScope("single");
      setSelectedSeries([]);
      return;
    }
    let active = true;
    setSeries({ loading: true, error: "", rows: [] });
    setScope("single");
    setSelectedSeries([]);
    void personalApi.recurrence(record.id).then(({ data }) => {
      if (active) setSeries({ loading: false, error: "", rows: data.results ?? [] });
    }).catch(cause => {
      if (active) setSeries({ loading: false, error: apiErrorMessage(cause, t("seriesLoadError")), rows: [] });
    });
    return () => { active = false; };
  }, [kind, record, recurrenceCount, seriesRetry, t]);

  const eligibleSeries = series.rows.filter(row => row.id !== record?.id && !row.financial_locked);
  const allSeriesSelected = eligibleSeries.length > 0 && eligibleSeries.every(row => selectedSeries.includes(row.id));
  const toggleSeries = (id: string) => setSelectedSeries(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  const toggleAllSeries = () => setSelectedSeries(allSeriesSelected ? [] : eligibleSeries.map(row => row.id));

  const update = (name: string, value: string) => setForm(previous => ({ ...previous, [name]: value }));
  const text = (name: string, required = true) => <Input key={name} kind="text" label={t(name)} value={form[name] || ""} required={required} maxLength={name === "notes" ? 500 : 120} disabled={busy} onChange={event => update(name, event.target.value)} />;
  const amount = (name: string, required = true) => <Input key={name} kind="amount" allowNegative={name === "initial_balance" || kind === "contribute"} currency={currency} label={t(name)} value={form[name] || ""} required={required} disabled={busy} onValueChange={(value: string) => update(name, value)} />;
  const date = (name: string, required = true) => <Input key={name} kind="date" label={t(name)} value={form[name] || ""} required={required} disabled={busy} onValueChange={(value: string) => update(name, value)} />;
  const options = (name: string, values: { id: string; name: string }[], optional = false) => {
    const items = optional ? [{ id: "", name: t(name === "category_id" ? kind === "transactions" ? "defaultCategory" : "allCategories" : "choose") }, ...values] : values;
    return <Select key={name} label={t(name)} items={items} selected={items.filter(value => value.id === form[name])} onChange={items => update(name, items[0]?.id || "")} getItemKey={item => item.id} getItemLabel={item => item.name} buttonLabel={t("choose")} singleSelect hideCheckboxes disabled={busy} />;
  };
  const choices = (name: string, values: string[]) => options(name, values.map(value => ({ id: value, name: t(value) })));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || lock.current || loading || optionsFailed) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (kind === "settle") await personalApi.settle(record!.id, { bank_id: form.bank_id, amount: form.amount || undefined, value_date: form.value_date, idempotency_key: key.current });
      else if (kind === "contribute") await personalApi.contribute(record!.id, { amount: form.amount, note: form.notes, idempotency_key: key.current });
      else if (kind === "transfer") await personalApi.transfer({ source_bank_id: form.source_bank_id, destination_bank_id: form.destination_bank_id, amount: form.amount, value_date: form.value_date, notes: form.notes, idempotency_key: key.current });
      else {
        let payload: Record<string, unknown> = {};
        if (kind === "transactions") payload = {
          description: form.description, notes: form.notes,
          ...(!editLocked ? { amount: form.amount, kind: form.kind, due_date: form.due_date, category_id: form.category_id || null } : {}),
          ...(!record ? {
            installment_count: form.recurrence_enabled === "true" ? Number(form.installment_count) : 1,
            interval_months: Number(form.interval_months),
            weekend_action: Number(form.weekend_action),
            idempotency_key: key.current,
          } : {}),
        };
        if (kind === "categories") payload = { name: form.name, kind: form.kind || null, is_active: form.is_active === "true" };
        if (kind === "budgets") payload = { name: form.name, month: form.month.slice(0, 7) + "-01", category_id: form.category_id || null, limit: form.limit };
        if (kind === "goals") payload = { name: form.name, target: form.target, target_date: form.target_date || null };
        if (kind === "transactions" && record && scope === "selected" && series.rows.length > 1) {
          if (!selectedSeries.length) {
            setError(t("chooseAtLeastOne"));
            return;
          }
          const versions = Object.fromEntries(series.rows.map(row => [row.id, row.version]));
          const data: Record<string, unknown> = { description: form.description, notes: form.notes };
          if (!editLocked) {
            data.amount = form.amount;
            data.due_date = form.due_date;
            if (form.category_id) data.cashflow_category = form.category_id;
          }
          await personalApi.editRecurrence(record.id, {
            ids: [record.id, ...selectedSeries],
            versions,
            data,
            select_all: false,
            exclude_ids: [],
          });
          onSaved();
          onClose();
          return;
        }
        if (record) await personalApi.edit(kind, record.id, payload);
        else await personalApi.create(kind, payload);
      }
      onSaved();
      onClose();
    } catch (cause) { setError(apiErrorMessage(cause, t("error"))); }
    finally { lock.current = false; setBusy(false); }
  };

  return <FloatingDialog isOpen title={kind === "transactions" && !record && transactionKind ? t(transactionKind === "income" ? "createCreditEntry" : "createDebitEntry") : t(["settle", "contribute", "transfer"].includes(kind) ? kind : record ? "edit" : "create")} description={t(record && kind === "transactions" ? "editDialogHint" : `${kind}DialogHint`)} closeLabel={t("close")} onClose={() => { if (!busy) onClose(); }} onSubmit={save} busy={busy} loading={loading} width={600} height={650} footer={<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("cancel")}</Button><Button type="submit" disabled={busy || loading || optionsFailed} isLoading={busy}>{t("save")}</Button></div>}>
    {error && <ErrorState message={error} size="sm" className="mb-5 leading-6" action={optionsFailed ? <Button type="button" variant="outline" size="xs" onClick={() => setRetry(value => value + 1)}>{t("retry")}</Button> : undefined} />}
    {loading ? <DialogSkeleton label={t("loading")} /> : <div className="grid gap-5 sm:grid-cols-2">
      {kind === "transactions" && <>
        <div className="sm:col-span-2">{text("description")}</div>
        {!editLocked && <>{(record || !transactionKind) && choices("kind", ["income", "expense"])}{amount("amount")}{date("due_date")}{options("category_id", categories.filter(item => !item.kind || item.kind === form.kind), true)}</>}
        <div className="sm:col-span-2">{text("notes", false)}{record ? <TransactionAttachments entryId={record.id}/> : <p className="mt-3 text-[11px] leading-5 text-slate-400">{t("saveBeforeFiles")}</p>}</div>
        {!record && <details className="text-xs text-slate-500 sm:col-span-2"><summary className="cursor-pointer py-2">{t("recurrence")}</summary><div className="mt-3 space-y-3">
          <ToggleSwitch checked={form.recurrence_enabled === "true"} onChange={enabled => { update("recurrence_enabled", String(enabled)); if (enabled && Number(form.installment_count) < 2) update("installment_count", "2"); }} label={t("repeatTransaction")} description={t("recurrenceHelp")} disabled={busy}/>
          {form.recurrence_enabled === "true" && <div className="grid gap-4 sm:grid-cols-2">
            <Input kind="text" type="number" min={2} max={120} step={1} label={t("installment_count")} value={form.installment_count} onChange={event => update("installment_count", event.target.value)} />
            <Select<{id:string;name:string}> label={t("interval_months")} items={[0,1,2,3,6,12].map(value => ({id:String(value),name:t(`recurrenceIntervals.${value}`)}))} selected={[{id:form.interval_months,name:t(`recurrenceIntervals.${form.interval_months}`)}]} onChange={items => update("interval_months", items[0]?.id || "1")} getItemKey={item => item.id} getItemLabel={item => item.name} buttonLabel={t("choose")} singleSelect hideFilter disabled={busy}/>
            <Select<{id:string;name:string}> label={t("weekend_action")} items={[0,1,-1].map(value => ({id:String(value),name:t(`weekendActions.${value}`)}))} selected={[{id:form.weekend_action,name:t(`weekendActions.${form.weekend_action}`)}]} onChange={items => update("weekend_action", items[0]?.id || "0")} getItemKey={item => item.id} getItemLabel={item => item.name} buttonLabel={t("choose")} singleSelect hideFilter disabled={busy}/>
          </div>}
        </div></details>}
        {record && kind === "transactions" && (series.loading || series.error || series.rows.length > 1) && <details open className="text-xs text-slate-500 sm:col-span-2">
          <summary className="cursor-pointer py-2">{t("recurringSeries")}</summary>
          <div className="mt-3 space-y-3">
            {series.loading ? <p>{t("loadingSeries")}</p> : series.error ? <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p>{series.error}</p><Button type="button" size="xs" variant="outline" className="mt-2" onClick={() => setSeriesRetry(value => value + 1)}>{t("retry")}</Button></div> : <>
              <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                <label className="flex min-h-9 items-center gap-2"><input type="radio" className="size-3 accent-[var(--accentPrimary)]" name="personal-recurrence-scope" checked={scope === "single"} onChange={() => { setScope("single"); setSelectedSeries([]); }} disabled={busy}/>{t("onlyThisTransaction")}</label>
                <label className="flex min-h-9 items-center gap-2"><input type="radio" className="size-3 accent-[var(--accentPrimary)]" name="personal-recurrence-scope" checked={scope === "selected"} onChange={() => setScope("selected")} disabled={busy}/>{t("selectedTransactions", { count: selectedSeries.length + 1 })}</label>
              </div>
              {scope === "selected" && <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  <Checkbox checked={allSeriesSelected} indeterminate={selectedSeries.length > 0 && !allSeriesSelected} onChange={toggleAllSeries} disabled={busy || !eligibleSeries.length} aria-label={t("selectAll")} />
                  {t("selectAll")}
                </label>
                <div className="divide-y divide-slate-100">
                  {series.rows.map(row => <label key={row.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <Checkbox checked={row.id === record.id || selectedSeries.includes(row.id)} disabled={busy || row.id === record.id || row.financial_locked} onChange={() => toggleSeries(row.id)} aria-label={`${row.installment_index}/${row.installment_count}`} />
                    <span className="min-w-0 flex-1"><span className="block font-medium text-slate-700">{row.installment_index}/{row.installment_count} · {formatDateFromISO(row.due_date)}</span>{row.id === record.id ? <span className="text-[10px] text-slate-400">{t("currentTransaction")}</span> : row.financial_locked ? <span className="text-[10px] text-amber-600">{t("lockedSeries")}</span> : null}</span>
                    <span className="tabular-nums text-slate-700">{formatCurrency(row.amount, currency)}</span>
                  </label>)}
                </div>
              </div>}
              <p className="text-[11px] leading-5 text-slate-500">{t("bulkRecurrenceHint")}</p>
            </>}
          </div>
        </details>}
        {editLocked && <p className="text-xs leading-6 text-slate-500 sm:col-span-2">{t("lockedTransaction")}</p>}
      </>}
      {kind === "categories" && <>{text("name")}{choices("kind", ["income", "expense"])}</>}
      {kind === "categories" && <ToggleSwitch checked={form.is_active === "true"} onChange={value => update("is_active", String(value))} label={t("active")} />}
      {kind === "budgets" && <>{text("name")}{date("month")}{options("category_id", categories.filter(item => item.kind !== "income"), true)}{amount("limit")}</>}
      {kind === "goals" && <>{text("name")}{amount("target")}{date("target_date", false)}</>}
      {kind === "settle" && <><div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-6 text-gray-600 sm:col-span-2">{t("partialPaymentHint")}<p className="mt-1 font-medium text-gray-800">{t("open_amount")}: {formatCurrency(record && "open_amount" in record ? record.open_amount : "0", currency)}</p></div>{options("bank_id", accounts)}{amount("amount")}{date("value_date")}</>}
      {kind === "transfer" && <>{options("source_bank_id", accounts)}{options("destination_bank_id", accounts.filter(item => item.id !== form.source_bank_id))}{amount("amount")}{date("value_date")}{text("notes", false)}</>}
      {kind === "contribute" && <>{amount("amount")}{text("notes", false)}<p className="text-xs leading-6 text-slate-500 sm:col-span-2">{t("contributionHint")}</p></>}
    </div>}
  </FloatingDialog>;
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SidePanel, { SidePanelFooter, SidePanelDetails } from "@/components/Modal/SidePanel";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import ToggleSwitch from "@/shared/ui/ToggleSwitch";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import { api } from "@/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { StatementImportRow, StatementImportLookups, UpdateStatementImportRowRequest } from "@/models/finance/imports";
import LookupSelect from "./LookupSelect";
import { parseMinorAmount } from "./importUtils";

export default function ImportRowEditor({ row, sessionId, lookups, readOnly, onClose, onSaved }: {
  row: StatementImportRow; sessionId: string; lookups: StatementImportLookups; readOnly: boolean; onClose(): void; onSaved(): Promise<void>;
}) {
  const { t } = useTranslation("statements");
  const initial = {
    description: row.final_description || row.source_description,
    due_date: row.final_due_date || row.source_date || "",
    amount: row.final_amount_minor == null ? "" : (row.final_amount_minor / 100).toFixed(2),
    tx_type: String(row.final_tx_type ?? row.source_tx_type ?? ""), category: row.cashflow_category?.id || "",
    entity: row.entity?.id || "", project: row.project?.id || "", document: row.document_type?.id || "",
    observation: row.final_observation || "", notes: row.final_notes || "", family: false,
    departments: row.resolved_departments || row.departments || [], items: row.resolved_items || row.items || [],
  };
  const [draft, setDraft] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState(""), [discard, setDiscard] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const patch = (data: Partial<typeof draft>) => setDraft(previous => ({ ...previous, ...data }));
  useEffect(() => {
    if (!dirty || readOnly) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, readOnly]);
  const close = () => { if (!busy) { if (dirty && !readOnly) setDiscard(true); else onClose(); } };
  const save = async (excluded = false) => {
    const amount = parseMinorAmount(draft.amount);
    if (!excluded && (amount == null || !draft.due_date || !draft.category || !draft.tx_type || !draft.description.trim())) { setError(t("workspace.required")); return; }
    setBusy(true); setError("");
    try {
      const data: UpdateStatementImportRowRequest = excluded ? { status: "excluded" } : {
        description: draft.description, due_date: draft.due_date, amount_minor: amount, tx_type: Number(draft.tx_type),
        cashflow_category_id: draft.category, entity_id: draft.entity || null, project_id: draft.project || null, document_type: draft.document || null,
        observation: draft.observation, notes: draft.notes, departments: draft.departments, items: draft.items,
        apply_to_installment_family: draft.family, status: "ready",
      };
      await api.updateStatementImportRow(sessionId, row.id, data);
      await onSaved(); onClose();
    } catch (cause) { setError(apiErrorMessage(cause, t("workspace.error"))); }
    finally { setBusy(false); }
  };
  const matched = row.candidate_payload?.category_source !== "ai" ? row.candidate_payload?.row_candidates?.[0] : undefined;
  const suggested = lookups.cashflow_categories.find(item => item.id === row.candidate_payload?.suggested_category_id);
  if (readOnly) return <SidePanel isOpen title={t("workspace.transaction")} subtitle={row.source_description} eyebrow={t("workspace.reviewTitle")} onClose={onClose}><SidePanelDetails fields={[
    { label: t("workspace.description"), value: draft.description }, { label: t("workspace.date"), value: draft.due_date },
    { label: t("workspace.amount"), value: draft.amount }, { label: t("workspace.direction"), value: t(draft.tx_type === "-1" ? "workspace.paid" : "workspace.received") },
    { label: t("workspace.category"), value: row.cashflow_category?.label }, { label: t("workspace.entity"), value: row.entity?.label },
    { label: t("workspace.project"), value: row.project?.label }, { label: t("workspace.document"), value: row.document_type?.label },
    { label: t("workspace.observation"), value: draft.observation }, { label: t("workspace.notes"), value: draft.notes },
  ]} /></SidePanel>;
  return <SidePanel isOpen title={t("workspace.transaction")} subtitle={row.source_description} eyebrow={t("workspace.reviewTitle")} mode="edit" busy={busy} onClose={close} overlay={<ConfirmToast open={discard} text={t("workspace.discard")} confirmLabel={t("workspace.discardAction")} cancelLabel={t("workspace.cancel")} onConfirm={onClose} onCancel={() => setDiscard(false)} />}>
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => { event.preventDefault(); if (!readOnly && !busy) void save(); }}>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-6">
        {row.duplicate_confidence >= .8 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">{t("workspace.duplicateWarning")}</p>}
        {suggested && !readOnly && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3"><div className="text-sm"><p className="text-xs text-slate-500">{t(row.candidate_payload?.category_source === "ai" ? "workspace.aiSuggestion" : "workspace.historySuggestion")}</p><p className="mt-1 font-medium text-slate-800">{suggested.label}</p>{matched && <p className="mt-1 text-xs text-slate-500">{[matched.entity_label, matched.project_label, matched.document_type].filter(Boolean).join(" · ")}</p>}</div><Button variant="outline" size="sm" onClick={() => patch({ category: suggested.id, ...(matched ? { entity: matched.entity_id || draft.entity, project: matched.project_id || draft.project, document: matched.document_type || draft.document } : {}) })} disabled={busy}>{t("workspace.useSuggestion")}</Button></div>}
        <fieldset disabled={busy || readOnly} className="space-y-5">
          <Input label={t("workspace.description")} value={draft.description} onChange={event => patch({ description: event.target.value })} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Input label={t("workspace.date")} type="date" value={draft.due_date} onChange={event => patch({ due_date: event.target.value })} required /><Input label={t("workspace.amount")} inputMode="decimal" value={draft.amount} onChange={event => patch({ amount: event.target.value })} placeholder="0.00" required /></div>
          <LookupSelect label={t("workspace.direction")} items={[{ id: "1", label: t("workspace.received") }, { id: "-1", label: t("workspace.paid") }]} value={draft.tx_type} onChange={value => patch({ tx_type: value })} disabled={busy || readOnly} />
          <LookupSelect label={t("workspace.category")} items={lookups.cashflow_categories} value={draft.category} onChange={value => patch({ category: value })} disabled={busy || readOnly} />
          <LookupSelect label={t("workspace.entity")} items={lookups.entities} value={draft.entity} onChange={value => patch({ entity: value })} disabled={busy || readOnly} />
          <details className="rounded-lg border border-slate-200"><summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">{t("workspace.additional")}</summary><div className="space-y-5 border-t border-slate-100 p-4">
            <LookupSelect label={t("workspace.document")} items={lookups.document_types} value={draft.document} onChange={value => patch({ document: value })} disabled={busy || readOnly} />
            <LookupSelect label={t("workspace.project")} items={lookups.projects} value={draft.project} onChange={value => patch({ project: value })} disabled={busy || readOnly} />
            <Input label={t("workspace.observation")} value={draft.observation} onChange={event => patch({ observation: event.target.value })} />
            <Input label={t("workspace.notes")} value={draft.notes} onChange={event => patch({ notes: event.target.value })} />
            <LookupSelect label={t("workspace.departments")} items={lookups.departments} value="" onChange={id => { if (id && !draft.departments.some(item => item.department_id === id)) patch({ departments: [...draft.departments, { department_id: id, percent: "0" }] }); }} disabled={busy || readOnly} />
            {draft.departments.map(item => <div className="flex items-center gap-2" key={item.department_id}><span className="flex-1 text-xs text-slate-600">{lookups.departments.find(option => option.id === item.department_id)?.label || item.department_id}</span><Input aria-label={t("workspace.percent")} size="sm" type="number" min="0" max="100" value={item.percent} onChange={event => patch({ departments: draft.departments.map(department => department === item ? { ...department, percent: event.target.value } : department) })} /><Button variant="ghost" size="sm" onClick={() => patch({ departments: draft.departments.filter(department => department !== item) })}>{t("workspace.remove")}</Button></div>)}
            <LookupSelect label={t("workspace.items")} items={lookups.inventory_items} value="" onChange={id => { if (id && !draft.items.some(item => item.item_id === id)) patch({ items: [...draft.items, { item_id: id, quantity: "1" }] }); }} disabled={busy || readOnly} />
            {draft.items.map(item => <div className="flex items-center gap-2" key={item.item_id}><span className="flex-1 text-xs text-slate-600">{lookups.inventory_items.find(option => option.id === item.item_id)?.label || item.item_id}</span><Input aria-label={t("workspace.quantity")} size="sm" type="number" min="0.001" step="0.001" value={item.quantity} onChange={event => patch({ items: draft.items.map(inventory => inventory === item ? { ...inventory, quantity: event.target.value } : inventory) })} /><Button variant="ghost" size="sm" onClick={() => patch({ items: draft.items.filter(inventory => inventory !== item) })}>{t("workspace.remove")}</Button></div>)}
            <ToggleSwitch checked={draft.family} onChange={value => patch({ family: value })} label={t("workspace.family")} /><p className="text-xs leading-5 text-slate-500">{t("workspace.familyHelp")}</p>
          </div></details>
        </fieldset>
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
      <SidePanelFooter><div className="flex w-full flex-wrap items-center justify-end gap-2"><Button variant="cancel" disabled={busy} onClick={close}>{t("workspace.cancel")}</Button>{!readOnly && <><Button variant="outline" disabled={busy} onClick={() => void save(true)}>{t("workspace.exclude")}</Button><Button variant="primary" type="submit" isLoading={busy} disabled={busy}>{t("workspace.save")}</Button></>}</div></SidePanelFooter>
    </form>
  </SidePanel>;
}

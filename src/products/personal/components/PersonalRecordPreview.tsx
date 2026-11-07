import TransactionAttachments from "./TransactionAttachments";
import { useEffect, useState } from "react";
import { personalApi } from "../services/api";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useTranslation } from "react-i18next";
import SidePanel, { SidePanelDetails } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { PersonalWorkspaceCollection, PersonalRecord, PersonalTransaction } from "@/products/personal/types";

const fieldsByCollection: Record<PersonalWorkspaceCollection, string[]> = {
  transactions: ["kind", "amount", "paid_amount", "open_amount", "status", "due_date", "category_name", "bank_name", "installment_index", "installment_count", "notes"],
  categories: ["kind", "is_active"],
  budgets: ["month", "category_name", "limit", "spent", "remaining", "progress"],
  goals: ["target", "saved", "remaining", "progress", "target_date"],
  transfers: ["amount", "value_date", "source_bank_name", "destination_bank_name"],
};
const moneyFields = new Set(["amount", "paid_amount", "open_amount", "balance", "initial_balance", "limit", "spent", "remaining", "target", "saved"]);
const dateFields = new Set(["due_date", "value_date", "month", "target_date"]);
export default function PersonalRecordPreview({ collection, record, currency, readOnly, onClose, onEdit, onSettle, onContribute }: {
  collection: PersonalWorkspaceCollection; record: PersonalRecord | null; currency?: string; readOnly: boolean;
  onClose(): void; onEdit(record: PersonalRecord): void; onSettle(record: PersonalRecord): void; onContribute(record: PersonalRecord): void;
}) {
  const { t } = useTranslation("personal");
  const [detail, setDetail] = useState<PersonalTransaction | null>(null), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  const id = collection === "transactions" ? record?.id : undefined;
  useEffect(() => {
    setDetail(null); setError("");
    if (!id) return;
    let active = true;
    void personalApi.transaction(id).then(result => { if (active) setDetail(result.data); }).catch(cause => { if (active) setError(apiErrorMessage(cause, t("error"))); });
    return () => { active = false; };
  }, [id, retry, t]);
  const loaded = id ? detail?.id === id ? detail : null : record;
  const values = (loaded || record || {}) as Record<string, unknown>;
  const transfer = values.kind === "transfer" || collection === "transfers";
  const fields = transfer ? ["amount", "due_date", "source_bank_name", "destination_bank_name"] : fieldsByCollection[collection];
  const format = (key: string) => {
    const value = values[key];
    if (value === undefined || value === null || value === "") return null;
    if (moneyFields.has(key)) return formatCurrency(String(value), String(values.currency || currency || "EUR"));
    if (dateFields.has(key)) return formatDateFromISO(String(value));
    if (["kind", "status", "account_type"].includes(key)) return t(String(value));
    if (key === "is_active") return t(value ? "active" : "inactive");
    if (key === "progress") return `${Math.round(Number(value))}%`;
    return String(value);
  };
  return <SidePanel isOpen={!!record} loading={!!id && !loaded && !error} skeletonRows={fields.length} title={String(values.description || values.name || "")} eyebrow={t(transfer ? "transfer" : collection)} onClose={onClose} footer={loaded && !readOnly ? <>
    {collection === "transactions" && !transfer && values.status !== "settled" && <Button onClick={() => onSettle(loaded)}>{t("settle")}</Button>}
    {collection === "goals" && <Button onClick={() => onContribute(loaded)}>{t("contribute")}</Button>}
    {!transfer && <Button variant="outline" onClick={() => onEdit(loaded)}>{t("edit")}</Button>}
  </> : undefined}>
    {error ? <div role="alert" className="space-y-3 text-xs text-red-700"><p>{error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>{t("retry")}</Button></div> : loaded && <>
      <SidePanelDetails fields={fields.map(key => ({ label: t(key === "saved" ? "savedAmount" : key), value: format(key) }))}/>
      {collection === "transactions" && !transfer && detail && <section className="mt-6"><h3 className="text-xs font-semibold text-gray-800">{t("paymentHistory")}</h3>{detail.payments?.length ? <ul className="mt-3 divide-y divide-gray-100">{detail.payments.map(payment => <li key={payment.id} className="flex items-center justify-between gap-4 py-3 text-xs"><div><p className="font-medium text-gray-700">{payment.bank_name}</p><p className="mt-1 text-gray-400">{formatDateFromISO(payment.value_date)}</p></div><span className="tabular-nums text-gray-800">{formatCurrency(payment.amount, currency)}</span></li>)}</ul> : <p className="mt-3 text-xs text-gray-500">{t("noPayments")}</p>}</section>}
      {collection === "transactions" && !transfer && record && <TransactionAttachments key={record.id} entryId={record.id} editable={!readOnly}/>}
    </>}
  </SidePanel>;
}

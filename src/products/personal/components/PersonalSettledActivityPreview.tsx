import { useTranslation } from "react-i18next";
import SidePanel, { SidePanelDetails } from "@/components/Modal/SidePanel";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { PersonalSettledActivity } from "../types";

export default function PersonalSettledActivityPreview({ item, currency, onClose }: {
  item: PersonalSettledActivity | null; currency: string; onClose(): void;
}) {
  const { t } = useTranslation("personal");
  if (!item) return <SidePanel isOpen={false} title="" onClose={onClose}><></></SidePanel>;
  const transfer = item.kind === "transfer";
  const fields = [
    { label: t("kind"), value: t(item.kind) },
    { label: t("value_date"), value: formatDateFromISO(item.value_date) },
    { label: t("amount"), value: formatCurrency(item.amount, currency) },
    { label: t("balance"), value: item.running_balance != null ? formatCurrency(item.running_balance, currency) : "—" },
    ...(transfer ? [
      { label: t("source_bank_id"), value: item.source_bank_name || "—" },
      { label: t("destination_bank_id"), value: item.destination_bank_name || "—" },
    ] : [
      { label: t("bank_name"), value: item.bank_name || "—" },
      { label: t("due_date"), value: formatDateFromISO(item.due_date) },
      { label: t("transactionAmount"), value: formatCurrency(item.transaction_amount, currency) },
      { label: t("remaining"), value: formatCurrency(item.open_amount, currency) },
      { label: t("category_name"), value: item.category_name || "—" },
      ...(item.installment_count && item.installment_count > 1 ? [{ label: t("installment_index"), value: `${item.installment_index || 1} / ${item.installment_count}` }] : []),
    ]),
    { label: t("status"), value: t("settled") },
  ];
  return <SidePanel isOpen title={item.description || t("untitledTransaction")} eyebrow={t(transfer ? "transfer" : "settlement")} onClose={onClose}>
    <SidePanelDetails fields={fields}/>
    {!transfer && item.notes && <section className="mt-6"><h3 className="mb-2 text-xs font-semibold text-gray-800">{t("notes")}</h3><p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{item.notes}</p></section>}
  </SidePanel>;
}

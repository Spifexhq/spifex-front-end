import { useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { Column } from "@/shared/ui/DataTable";
import type { PersonalWorkspaceCollection, PersonalRecord } from "../types";

const field = (row: PersonalRecord, key: string) => String((row as unknown as Record<string, unknown>)[key] ?? "");
const isTransfer = (row: PersonalRecord) => field(row, "kind") === "transfer";

export function useCollectionColumns(collection: PersonalWorkspaceCollection, currency?: string) {
  const { t } = useTranslation("personal");
  return useMemo<Column<PersonalRecord>[]>(() => {
    const money = (value: string) => value ? formatCurrency(value, currency) : "—";
    const nameKey = collection === "transactions" || collection === "transfers" ? "description" : "name";
    const name: Column<PersonalRecord> = {
      key: "name",
      label: t(nameKey),
      render: row => isTransfer(row)
        ? <span className="inline-flex min-w-0 items-center gap-1.5"><ArrowLeftRight size={12} className="shrink-0 text-gray-400" aria-label={t("transfer")}/><span className="truncate">{field(row, nameKey)}</span></span>
        : field(row, nameKey),
    };
    const date = (key: string): Column<PersonalRecord> => ({ key, label: t(key), render: row => formatDateFromISO(field(row, key)) });
    const amount = (key: string, label = key): Column<PersonalRecord> => ({ key, label: t(label), render: row => money(field(row, key)) });

    if (collection === "transactions") return [
      name,
      date("due_date"),
      {
        key: "category", label: t("categories"),
        render: row => isTransfer(row) ? `${field(row, "source_bank_name")} → ${field(row, "destination_bank_name")}` : field(row, "category_name") || "—",
      },
      {
        key: "status", label: t("status"),
        render: row => {
          const status = field(row, "status");
          const dot = isTransfer(row) ? "bg-gray-400" : status === "settled" ? "bg-emerald-500" : "bg-amber-400";
          return <span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${dot}`}/>{t(isTransfer(row) ? "transferred" : status)}</span>;
        },
      },
      {
        key: "amount", label: t("amount"),
        render: row => <span className={`tabular-nums ${field(row, "kind") === "income" ? "text-emerald-700" : "text-gray-900"}`}>{money(field(row, "amount"))}</span>,
      },
      { key: "paid_amount", label: t("paid_amount"), render: row => isTransfer(row) ? null : money(field(row, "paid_amount")) },
      {
        key: "open_amount", label: t("remaining"), mobile: true, mobileWidth: "120px",
        render: row => isTransfer(row)
          ? <span className="inline-flex items-center gap-1 tabular-nums text-gray-500"><ArrowLeftRight size={11} aria-hidden="true"/>{money(field(row, "amount"))}</span>
          : money(field(row, "open_amount")),
      },
    ];
    if (collection === "transfers") return [name, date("value_date"),
      { key: "source", label: t("source_bank_id"), render: row => field(row, "source_bank_name") },
      { key: "destination", label: t("destination_bank_id"), render: row => field(row, "destination_bank_name") },
      { ...amount("amount"), mobile: true, mobileWidth: "110px" },
    ];
    if (collection === "categories") return [name,
      { key: "kind", label: t("kind"), mobile: true, render: row => t(field(row, "kind") || "allCategories") },
      {
        key: "status", label: t("status"),
        render: row => {
          const active = field(row, "is_active") === "true";
          return <span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`}/>{t(active ? "active" : "inactive")}</span>;
        },
      },
    ];
    const progress: Column<PersonalRecord> = {
      key: "progress", label: t("progress"), mobile: true, mobileWidth: "120px",
      render: row => {
        const value = Number(field(row, "progress")) || 0;
        return <div className="w-24"><p className="mb-1 text-xs tabular-nums">{Math.round(value)}%</p><div className="h-1.5 rounded-full bg-gray-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }}/></div></div>;
      },
    };
    return collection === "budgets"
      ? [name, date("month"), amount("limit"), amount("remaining"), progress]
      : [name, amount("target"), amount("remaining"), progress];
  }, [collection, currency, t]);
}

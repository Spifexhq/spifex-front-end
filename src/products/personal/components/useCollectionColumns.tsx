import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { Column } from "@/shared/ui/DataTable";
import type { PersonalWorkspaceCollection, PersonalRecord } from "../types";

const field = (row: PersonalRecord, key: string) => String((row as unknown as Record<string, unknown>)[key] ?? "");
export function useCollectionColumns(collection: PersonalWorkspaceCollection, currency?: string) {
  const { t } = useTranslation("personal");
  return useMemo<Column<PersonalRecord>[]>(() => {
    const money = (value: string) => value ? formatCurrency(value, currency) : "—";
    const nameKey = "name";
    const name: Column<PersonalRecord> = {
      key: "name",
      label: t(nameKey),
      render: row => field(row, nameKey),
    };
    const date = (key: string): Column<PersonalRecord> => ({ key, label: t(key), render: row => formatDateFromISO(field(row, key)) });
    const amount = (key: string, label = key): Column<PersonalRecord> => ({ key, label: t(label), render: row => money(field(row, key)) });

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

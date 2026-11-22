import { useTranslation } from "react-i18next";
import Card from "@/shared/ui/Card";
import { formatCurrency } from "@/lib";
import type { OverviewData } from "@/models/finance/overview";

const SWATCHES = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9"];

/** Payments grouped by category for the selected overview period. */
export default function SpendingByCategory({ data }: { data: OverviewData }) {
  const { t } = useTranslation("overview");
  const money = (value: string | number) => formatCurrency(value, data.currency || undefined);
  const expenses = Number(data.metrics?.out || 0);
  const categoriesTotal = data.categories.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <Card as="section" radius="xl" tone="slate" padding="default" className="min-w-0" title={t("spending")} tooltip={t("spendingDescription")}>
      <p className="mb-5 text-2xl font-semibold tracking-tight text-slate-900">{money(data.metrics?.out || "0")}</p>
      <div aria-hidden="true" className="mb-6 flex h-2 overflow-hidden rounded-full bg-slate-100">
        {data.categories.map((item, index) => (
          <div key={item.id} style={{ width: `${expenses ? (Number(item.amount) / expenses) * 100 : 0}%`, backgroundColor: SWATCHES[index] }} />
        ))}
      </div>
      <ul className="space-y-4">
        {data.categories.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2.5 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: SWATCHES[index] }} />
            <span className="min-w-0 flex-1 truncate text-slate-600">{item.name || t("uncategorized")}</span>
            <span className="font-medium tabular-nums text-slate-900">{money(item.amount)}</span>
            <span className="w-8 text-right tabular-nums text-slate-400">{expenses ? Math.round((Number(item.amount) / expenses) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
      {!data.categories.length && <p className="py-5 text-sm text-slate-400">{t("noSpending")}</p>}
      {expenses - categoriesTotal > 0.01 && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {t("otherCategories")} · {money((expenses - categoriesTotal).toFixed(2))}
        </p>
      )}
    </Card>
  );
}

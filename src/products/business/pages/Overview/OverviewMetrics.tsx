import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib";
import type { OverviewData } from "@/models/finance/overview";
import OverviewMetricCards, { type OverviewMetricCard } from "@/shared/financial/components/Overview/OverviewMetricCards";
import { cumulativeValues, percentageChange } from "./overviewUtils";

export default function OverviewMetrics({ data }: { data: OverviewData }) {
  const { t, i18n } = useTranslation("overview");
  const items = useMemo<OverviewMetricCard[]>(() => {
    const money = (value: string | number) => formatCurrency(value, data.currency || undefined);
    return (["in", "out", "net", "count"] as const).map((field, index) => {
      const value = Number(data.metrics?.[field] || 0);
      const previous = Number(data.previous?.[field] || 0);
      const delta = percentageChange(value, previous);
      const positive = delta != null && (field === "out" ? delta <= 0 : delta >= 0);
      const format = (current: number) => field === "count"
        ? current.toLocaleString(i18n.language, { maximumFractionDigits: 0 })
        : money(current);
      return {
        key: field,
        label: t(`cards.${field}`),
        value,
        finalValue: field === "count" ? value.toLocaleString(i18n.language) : money(data.metrics?.[field] || "0"),
        format,
        color: ["#6366f1", "#94a3b8", "#10b981", "#818cf8"][index],
        trend: cumulativeValues(data.series, field),
        delta,
        deltaTone: delta == null || field === "count" ? "neutral" : positive ? "positive" : "negative",
        deltaLabel: t("noComparison"),
        caption: t("previousPeriod"),
      };
    });
  }, [data, i18n.language, t]);
  return <OverviewMetricCards items={items} locale={i18n.language} />;
}

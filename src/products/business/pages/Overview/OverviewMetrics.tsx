import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatCompactCurrency } from "@/lib";
import type { OverviewData } from "@/models/finance/overview";
import OverviewMetricCards, { type OverviewMetricCard } from "@/shared/financial/components/Overview/OverviewMetricCards";
import { CHART_COLORS, trendColor } from "@/shared/financial/chartColors";
import { cumulativeValues, percentageChange } from "./overviewUtils";

export default function OverviewMetrics({ data }: { data: OverviewData }) {
  const { t, i18n } = useTranslation("overview");
  const items = useMemo<OverviewMetricCard[]>(() => {
    const money = (value: string | number) => formatCompactCurrency(Number(value), data.currency || undefined);
    return (["in", "out", "net"] as const).map((field) => {
      const value = Number(data.metrics?.[field] || 0);
      const previous = Number(data.previous?.[field] || 0);
      const delta = percentageChange(value, previous);
      const positive = delta != null && (field === "out" ? delta <= 0 : delta >= 0);
      const format = (current: number) => money(current);
      const trend = cumulativeValues(data.series, field);
      return {
        key: field,
        label: t(`cards.${field}`),
        value,
        finalValue: money(data.metrics?.[field] || "0"),
        format,
        color: field === "in" ? CHART_COLORS.positive : field === "out" ? CHART_COLORS.negative : trendColor(trend),
        trend,
        delta,
        deltaTone: delta == null ? "neutral" : positive ? "positive" : "negative",
        deltaLabel: t("noComparison"),
        caption: t("previousPeriod"),
      };
    });
  }, [data, t]);
  return <OverviewMetricCards items={items} columns={3} locale={i18n.language} />;
}

import { useTranslation } from "react-i18next";
import PriceChart from "@/shared/ui/PriceChart";
import type { PriceLineSeries, PricePoint } from "@/shared/ui/PriceChart";
import { formatCurrency, formatDateFromISO } from "@/lib";
import InfoTooltip from "@/shared/ui/InfoTooltip";
import Card from "@/shared/ui/Card";
import SpendingByCategory from "@/shared/financial/components/SpendingByCategory";
import type { OverviewData } from "@/models/finance/overview";

const INCOMING_COLOR = "#6366F1";
const OUTGOING_COLOR = "#94A3B8";
const NET_UP_COLOR = "#00BA7C";
const NET_DOWN_COLOR = "#F4212E";

const GROUPS = ["day", "week", "month"] as const;
type Group = (typeof GROUPS)[number];

export default function FinancialCharts({ data, group, onGroup }: {
  data: OverviewData; group: Group; onGroup(group: Group): void;
}) {
  const { t } = useTranslation("overview");
  const money = (value: string|number) => formatCurrency(value, data.currency || undefined);

  // Accumulate in minor units to avoid floating-point drift across buckets.
  let periodNetMinor = 0;
  const hasActivity = Number(data.metrics?.count ?? 0) > 0;
  const points: PricePoint[] = (hasActivity ? data.series : []).map(point => {
    const netValue = Number(point.net);
    periodNetMinor += Number.isFinite(netValue) ? Math.round(netValue * 100) : 0;
    return { t: point.date, value: periodNetMinor / 100 };
  });

  const incoming = data.series.map(point => Number(point.in) || 0);
  const outgoing = data.series.map(point => Number(point.out) || 0);

  const lines: PriceLineSeries[] = [
    { key: "incoming", label: t("received"), color: INCOMING_COLOR, values: incoming },
    { key: "outgoing", label: t("paid"), color: OUTGOING_COLOR, values: outgoing },
  ];

  const netValue = points.length ? points[points.length - 1].value : 0;
  const netColor = netValue >= 0 ? NET_UP_COLOR : NET_DOWN_COLOR;

  const previousNet = Number(data.previous?.net);
  const reference = Number.isFinite(previousNet) && previousNet !== 0 ? previousNet : undefined;

  const pills = GROUPS.map(value => ({ key: value, label: t(`groups.${value}`) }));

  const detail = (index: number) => {
    const point = points[index];
    if (!point) return "";
    return `${formatDateFromISO(String(point.t))} · ${t("received")} ${money(incoming[index] ?? 0)} · ${t("paid")} ${money(outgoing[index] ?? 0)}`;
  };

  return <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
    <Card as="section" radius="xl" tone="slate" padding="none" className="min-w-0 overflow-hidden">
      <PriceChart
        ranges={[{ key: group, label: t(`groups.${group}`), points }]}
        range={group}
        tabs={pills}
        tab={group}
        onTabChange={key => onGroup(GROUPS.find(value => value === key) ?? group)}
        tabsLabel={t("groupBy")}
        title={t("trend")}
        titleAside={<InfoTooltip label={t("calculation")}>{t("scope")}</InfoTooltip>}
        meta={t(`trendDescriptions.${data.period.basis}`)}
        reference={reference}
        valueFormatter={money}
        dateFormatter={value => formatDateFromISO(String(value))}
        lines={lines}
        showVolume={false}
        surface={false}
        height={260}
        detailFormatter={detail}
        labels={{ empty: t("noActivity") }}
        ariaLabel={t("chartLabel")}
      />
      <div className="flex flex-wrap items-center gap-5 border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: INCOMING_COLOR }}/>{t("received")}</span>
        <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: OUTGOING_COLOR }}/>{t("paid")}</span>
        <span className="inline-flex items-center gap-1"><span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: netColor }}/>{t("periodNetTrend")}<InfoTooltip label={t("periodNetTrend")}>{t("periodNetTrendDescription")}</InfoTooltip></span>
        <span className="ml-auto">{data.currency}</span>
      </div>
    </Card>
    <SpendingByCategory data={data} />
  </div>;
}

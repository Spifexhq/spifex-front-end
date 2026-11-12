import { usePersonalReadRevision } from "../hooks/usePersonalReadRevision";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { personalApi } from "@/products/personal/services/api";
import { useAuthContext } from "@/hooks/useAuth";
import { formatCurrency, formatDateFromISO } from "@/lib";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { PersonalDashboard } from "@/products/personal/types";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import { Select } from "@/shared/ui/Select";
import { Download } from "lucide-react";
import FinancialCharts from "@/shared/financial/components/FinancialCharts";
import Card from "@/shared/ui/Card";
import OverviewFilterPanel from "@/shared/financial/components/Overview/OverviewFilterPanel";
import { exportSeries } from "@/shared/financial/overviewCsv";
import { EmptyState } from "@/shared/ui/State";
import OverviewMetricCards, { type OverviewMetricCard } from "@/shared/financial/components/Overview/OverviewMetricCards";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import DataTable from "@/shared/ui/DataTable";
import { today } from "../services/personalData";

type DateRange = { start_date: string; end_date: string };
type DashboardQuery = DateRange & { basis: "planned" | "settled"; cashflow_category_id?: string; description?: string };
const localISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function rangeForDays(days: number, anchor = new Date()): DateRange {
  const end = new Date(anchor);
  const start = new Date(anchor);
  start.setDate(start.getDate() - days + 1);
  return { start_date: localISO(start), end_date: localISO(end) };
}
function percentageChange(current: number, previous: number): number | null {
  return previous === 0 ? (current === 0 ? 0 : null) : (current - previous) / Math.abs(previous);
}
function cumulative(series: PersonalDashboard["series"], field: "in" | "out" | "net") {
  let total = 0;
  return series.map(point => (total += Number(point[field] || 0)));
}

export default function PersonalOverview({ reports = false }: { reports?: boolean }) {
  const { t, i18n } = useTranslation("personal");
  const { organization, permissions, isOwner, isSubscribed, user } = useAuthContext();
  const readRevision = usePersonalReadRevision();
  const access = JSON.stringify([permissions, isOwner, isSubscribed, readRevision, organization?.organization?.lifecycle]);
  const initialRange = useMemo<DateRange>(() => ({ start_date: `${today().slice(0, 7)}-01`, end_date: today() }), []);
  const initialQuery = useMemo<DashboardQuery>(() => ({ ...initialRange, basis: "planned" }), [initialRange]);
  const [draft, setDraft] = useState<DashboardQuery>(initialQuery);
  const [query, setQuery] = useState<DashboardQuery>(initialQuery);
  const [group, setGroup] = useState<"day" | "week" | "month">("day");
  const [snapshot, setSnapshot] = useState<{ workspace: string; access: string; data: PersonalDashboard } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const id = organization?.organization?.id || "";
  const data = snapshot?.workspace === id && snapshot.access === access ? snapshot.data : null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const fetch = async () => {
      const params: Record<string, string> = {
        start_date: query.start_date,
        end_date: query.end_date,
        basis: query.basis,
        group_by: group,
      };
      if (query.cashflow_category_id) params.cashflow_category_id = query.cashflow_category_id;
      if (query.description) params.description = query.description;
      for (let attempt = 0; ; attempt++) {
        try {
          return await personalApi.dashboard(reports, params);
        } catch (cause) {
          if (!active || attempt >= 2 || (cause as { code?: string })?.code !== "ERR_CANCELED") throw cause;
        }
      }
    };
    void fetch().then(result => {
      if (active) setSnapshot({ workspace: id, access, data: result.data });
    }).catch(cause => {
      if (active) setError(apiErrorMessage(cause, t("error")));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reports, query, group, id, retry, t, access]);

  const money = (value: string | number) => formatCurrency(value, data?.currency || undefined);
  const metricCards = useMemo<OverviewMetricCard[]>(() => {
    if (!data) return [];
    const formatMoney = (value: string | number) => formatCurrency(value, data.currency || undefined);
    const metric = (key: string, field: "in" | "out" | "net", color: string): OverviewMetricCard => {
      const value = Number(data.metrics?.[field] || 0);
      const previous = Number(data.previous?.[field] || 0);
      const delta = percentageChange(value, previous);
      const positive = delta != null && (field === "out" ? delta <= 0 : delta >= 0);
      return {
        key,
        label: t(key),
        value,
        finalValue: formatMoney(value),
        format: formatMoney,
        color,
        trend: cumulative(data.series, field),
        delta,
        deltaTone: delta == null ? "neutral" : positive ? "positive" : "negative",
        deltaLabel: t("noComparison", { ns: "overview" }),
        caption: t("previousPeriod", { ns: "overview" }),
      };
    };
    const balance = Number(data.available_balance || 0);
    return [
      { key: "balance", label: t("balance"), value: balance, finalValue: formatMoney(balance), format: formatMoney, color: "#6366f1", caption: t("currentBalance") },
      metric("income", "in", "#10b981"),
      metric("expense", "out", "#f97316"),
      metric("net", "net", "#818cf8"),
    ];
  }, [data, t]);

  if (!data && loading) return <PageSkeleton rows={7} />;

  const setRange = (range: DateRange) => {
    setDraft(previous => ({ ...previous, ...range }));
    setQuery(previous => ({ ...previous, ...range }));
  };
  const quickRanges = <div className="flex flex-wrap items-center gap-2">
    {[7, 30, 90].map(days => <Button key={days} variant="ghost" size="sm" onClick={() => setRange(rangeForDays(days))}>{t("lastDays", { count: days, ns: "overview" })}</Button>)}
    <Button variant="outline" size="sm" className="inline-flex items-center gap-2" onClick={exportCsv} disabled={!data || loading}><Download size={15} aria-hidden="true" />{t("export", { ns: "overview" })}</Button>
  </div>;
  const categoryOptions = data?.filter_options.categories || [];
  const hasFilters = !!(query.cashflow_category_id || query.description);
  const toolbar = <>
    <SegmentedControl<DashboardQuery["basis"]> value={query.basis} label={t("basis", { ns: "overview" })}
      items={(["planned", "settled"] as const).map(value => ({ value, label: t(`basisOptions.${value}`, { ns: "overview" }) }))}
      onChange={basis => { setDraft(previous => ({ ...previous, basis })); setQuery(previous => ({ ...previous, basis, cashflow_category_id: undefined })); }} />
    {quickRanges}
  </>;

  function exportCsv() {
    if (!data) return;
    const blob = new Blob([exportSeries(data.series, [
      t("date", { ns: "overview" }),
      t("received", { ns: "overview" }),
      t("paid", { ns: "overview" }),
      t("net", { ns: "overview" }),
      t("transactions", { ns: "overview" }),
    ])], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spifex-personal-${reports ? "reports" : "overview"}-${data.period.start}-${data.period.end}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const displayName = user?.name?.trim().split(/\s+/).slice(0, 2).join(" ") || t("there", { ns: "overview" });

  return <div className="space-y-5" aria-busy={loading}>
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{reports ? t("reports") : t(`greetings.${greeting}`, { ns: "overview", name: displayName })}</h1>
      <p className="text-sm text-slate-500">{t(reports ? "reportsDescription" : "overviewDescription")}</p>
    </header>

    <OverviewFilterPanel toolbar={toolbar} onSubmit={event => {
      event.preventDefault();
      setQuery(draft);
    }}>
      <div className="min-w-36 flex-1"><Input size="sm" kind="date" label={t("start_date")} value={draft.start_date} max={draft.end_date} onValueChange={value => setDraft(previous => ({ ...previous, start_date: value }))} required /></div>
      <div className="min-w-36 flex-1"><Input size="sm" kind="date" label={t("end_date")} value={draft.end_date} min={draft.start_date} onValueChange={value => setDraft(previous => ({ ...previous, end_date: value }))} required /></div>
      <div className="min-w-40 flex-1"><Select size="sm" label={t("category", { ns: "overview" })} buttonLabel={t("category", { ns: "overview" })} items={categoryOptions} selected={categoryOptions.filter(item => item.id === draft.cashflow_category_id)} onChange={selected => setDraft(previous => ({ ...previous, cashflow_category_id: selected[0]?.id }))} getItemKey={item => item.id} getItemLabel={item => item.label} singleSelect hideCheckboxes /></div>
      <div className="min-w-40 flex-[1.5]"><Input size="sm" label={t("description")} placeholder={t("searchPlaceholder", { ns: "overview" })} value={draft.description || ""} onChange={event => setDraft(previous => ({ ...previous, description: event.target.value }))} /></div>
      <Button type="submit" variant="primary" size="sm" disabled={!draft.start_date || !draft.end_date || draft.end_date < draft.start_date || loading}>{t("apply")}</Button>
      {hasFilters && <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft(previous => ({ ...previous, cashflow_category_id: undefined, description: undefined })); setQuery(previous => ({ ...previous, cashflow_category_id: undefined, description: undefined })); }}>{t("clear", { ns: "overview" })}</Button>}
    </OverviewFilterPanel>

    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<Button variant="outline" size="xs" onClick={() => setRetry(value => value + 1)}>{t("retry")}</Button></div>}

    {data && <>
      <div className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{formatDateFromISO(data.period.start)} – {formatDateFromISO(data.period.end)}</span>
        <span>{t(`basisDescriptions.${data.period.basis}`, { ns: "overview" })}</span>
        <span className="ml-auto text-slate-400">{data.currency}</span>
      </div>
      <OverviewMetricCards items={metricCards} locale={i18n.language} />
      {data.balances_by_currency.length > 1 && <div className="flex flex-wrap gap-4 text-xs text-slate-500">{data.balances_by_currency.map(item => <span key={item.currency}>{item.currency}: {formatCurrency(item.balance, item.currency)}</span>)}</div>}
      <FinancialCharts data={data} group={group} onGroup={setGroup} />
      {!reports && <>
        <div className="grid gap-3 lg:grid-cols-2">{([['budgets', data.budgets], ['goals', data.goals]] as const).map(([kind, items]) => <Card as="section" key={kind} radius="xl" tone="slate" padding="compact">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">{t(kind)}</h2><Link to={`/personal/${kind}`} className="text-xs font-medium text-slate-500 hover:text-slate-900">{t("viewAll")}</Link></div>
          {!items.length ? <EmptyState size="xs" title={t("empty")} /> : <ul className="space-y-4">{items.slice(0, 4).map(item => <li key={item.id}><div className="flex justify-between gap-4 text-xs"><span className="truncate text-slate-700">{item.name}</span><span className="tabular-nums text-slate-500">{Math.round(Number(item.progress) || 0)}%</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, Number(item.progress) || 0))}%` }} /></div></li>)}</ul>}
        </Card>)}</div>
        <section><h2 className="mb-3 text-sm font-semibold text-slate-900">{t("recent")}</h2><DataTable items={data.recent} columns={[{ key: "name", label: t("description"), render: row => row.description }, { key: "date", label: t("due_date"), render: row => row.date }, { key: "amount", mobile: true, label: t("amount"), render: row => money(row.amount) }]} emptyLabel={t("empty")} pagination={false} inspectable={false} /></section>
        <Card as="section" radius="xl" tone="slate" padding="compact"><h2 className="text-sm font-semibold text-slate-900">{t("upcoming")}</h2><ul className="mt-3 divide-y divide-slate-100">{data.upcoming.map(item => <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-xs"><div><p className="font-medium text-slate-700">{item.description}</p><p className="mt-1 text-slate-500">{item.date}</p></div><span className="tabular-nums">{money(item.amount)}</span></li>)}</ul>{!data.upcoming.length && <EmptyState size="xs" title={t("empty")} />}</Card>
      </>}
    </>}
  </div>;
}

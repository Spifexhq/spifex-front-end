import { usePersonalReadRevision } from "../hooks/usePersonalReadRevision";
import PersonalRecordDialog from "../components/PersonalRecordDialog";
import { readonlyWorkspace } from "../services/personalData";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { personalApi } from "@/products/personal/services/api";
import { useAuthContext } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { PersonalDashboard } from "@/products/personal/types";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import FinancialCharts from "@/shared/financial/components/FinancialCharts";
import OverviewFilterPanel from "@/shared/financial/components/Overview/OverviewFilterPanel";
import OverviewMetricCards, { type OverviewMetricCard } from "@/shared/financial/components/Overview/OverviewMetricCards";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import DataTable from "@/shared/ui/DataTable";
import { today } from "../services/personalData";

type DateRange = { start_date: string; end_date: string };
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
  const { organization, permissions, isOwner, isSubscribed } = useAuthContext();
  const readRevision = usePersonalReadRevision();
  const access = JSON.stringify([permissions, isOwner, isSubscribed, readRevision, organization?.organization?.lifecycle]);
  const initialRange = useMemo<DateRange>(() => ({ start_date: `${today().slice(0, 7)}-01`, end_date: today() }), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(initialRange);
  const [query, setQuery] = useState<DateRange>(initialRange);
  const [group, setGroup] = useState<"day" | "week" | "month">("day");
  const [snapshot, setSnapshot] = useState<{ workspace: string; access: string; data: PersonalDashboard } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const id = organization?.organization?.id || "";
  const data = snapshot?.workspace === id && snapshot.access === access ? snapshot.data : null;
  const isReadOnly = readonlyWorkspace(organization?.organization?.lifecycle);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const fetch = async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await personalApi.dashboard(reports, { ...query, group_by: group });
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
    setDraft(range);
    setQuery(range);
  };
  const quickRanges = <div className="flex flex-wrap items-center gap-1">
    {[7, 30, 90].map(days => <Button key={days} variant="ghost" size="sm" onClick={() => setRange(rangeForDays(days))}>{t("lastDays", { count: days, ns: "overview" })}</Button>)}
  </div>;
  const addTransaction = !reports && !isReadOnly ? <Button size="sm" onClick={() => setCreateOpen(true)}>{t("addTransaction")}</Button> : null;

  return <div className="space-y-6" aria-busy={loading}>
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t(reports ? "reports" : "overview")}</h1>
      <p className="text-sm text-slate-500">{t(reports ? "reportsDescription" : "overviewDescription")}</p>
    </header>

    <OverviewFilterPanel toolbar={<>{quickRanges}{addTransaction}</>} onSubmit={event => {
      event.preventDefault();
      setQuery(draft);
    }}>
      <div className="min-w-36 flex-1"><Input size="sm" kind="date" label={t("start_date")} value={draft.start_date} max={draft.end_date} onValueChange={value => setDraft(previous => ({ ...previous, start_date: value }))} required /></div>
      <div className="min-w-36 flex-1"><Input size="sm" kind="date" label={t("end_date")} value={draft.end_date} min={draft.start_date} onValueChange={value => setDraft(previous => ({ ...previous, end_date: value }))} required /></div>
      <Button type="submit" variant="primary" size="sm" disabled={!draft.start_date || !draft.end_date || draft.end_date < draft.start_date || loading}>{t("apply")}</Button>
    </OverviewFilterPanel>

    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<Button variant="outline" size="xs" onClick={() => setRetry(value => value + 1)}>{t("retry")}</Button></div>}

    {data && <>
      <OverviewMetricCards items={metricCards} locale={i18n.language} />
      {data.balances_by_currency.length > 1 && <div className="flex flex-wrap gap-4 text-xs text-slate-500">{data.balances_by_currency.map(item => <span key={item.currency}>{item.currency}: {formatCurrency(item.balance, item.currency)}</span>)}</div>}
      <FinancialCharts data={data} group={group} onGroup={setGroup} />
      {!reports && <>
        <div className="grid gap-3 lg:grid-cols-2">{([['budgets', data.budgets], ['goals', data.goals]] as const).map(([kind, items]) => <section key={kind} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">{t(kind)}</h2><Link to={`/personal/${kind}`} className="text-xs font-medium text-slate-500 hover:text-slate-900">{t("viewAll")}</Link></div>
          {!items.length ? <p className="py-4 text-xs text-slate-500">{t("empty")}</p> : <ul className="space-y-4">{items.slice(0, 4).map(item => <li key={item.id}><div className="flex justify-between gap-4 text-xs"><span className="truncate text-slate-700">{item.name}</span><span className="tabular-nums text-slate-500">{Math.round(Number(item.progress) || 0)}%</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, Number(item.progress) || 0))}%` }} /></div></li>)}</ul>}
        </section>)}</div>
        <section><h2 className="mb-3 text-sm font-semibold text-slate-900">{t("recent")}</h2><DataTable items={data.recent} columns={[{ key: "name", label: t("description"), render: row => row.description }, { key: "date", label: t("due_date"), render: row => row.date }, { key: "amount", mobile: true, label: t("amount"), render: row => money(row.amount) }]} emptyLabel={t("empty")} pagination={false} inspectable={false} /></section>
        <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-semibold text-slate-900">{t("upcoming")}</h2><ul className="mt-3 divide-y divide-slate-100">{data.upcoming.map(item => <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-xs"><div><p className="font-medium text-slate-700">{item.description}</p><p className="mt-1 text-slate-500">{item.date}</p></div><span className="tabular-nums">{money(item.amount)}</span></li>)}</ul>{!data.upcoming.length && <p className="mt-3 text-xs text-slate-500">{t("empty")}</p>}</section>
      </>}
    </>}
    {createOpen && !isReadOnly && <PersonalRecordDialog kind="transactions" currency={data?.currency || "EUR"} onClose={() => setCreateOpen(false)} onSaved={() => setRetry(value => value + 1)} />}
  </div>;
}

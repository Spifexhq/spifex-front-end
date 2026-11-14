import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  CircleAlert,
  Landmark,
  ListTree,
  LockKeyhole,
  Route,
  Sparkles,
} from "lucide-react";
import { api } from "@/core/api/requests";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { SkeletonLine } from "@/shared/ui/DataTable/DataTableSkeleton";
import { useAccountingSetup } from "../setup/useAccountingSetup";
import { useAccountingAiSetup } from "../setup/guided/AccountingAiSetupState";
import { useAccountingReviewGuide } from "../setup/review/AccountingReviewGuideState";
import AccountingMetricCard from "../components/AccountingMetricCard";
import type { SetupPhase } from "@/models/settings/accountingSetup";
import type { JournalEntry, TrialBalanceRow } from "@/models/settings/accounting";

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];
  const obj = input as Record<string, unknown>;
  for (const key of ["results", "items", "data", "entries"]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return [];
}

const STEP_TARGET: Record<SetupPhase, string> = {
  chart: "/accounting/chart-of-accounts",
  books: "/accounting/books",
  review: "/accounting/overview",
};

type OverviewIssue = { code: string; account_code?: string; target: string };
type Tone = "neutral" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-[11px] font-medium ${TONE[tone]}`}>{children}</span>;
}

function IssueList({ issues }: { issues: OverviewIssue[] }) {
  const { t } = useTranslation("accountingSettings");
  if (!issues.length) return null;
  return <ul className="divide-y divide-amber-100">
    {issues.slice(0, 5).map((issue, index) => <li key={`${issue.code}-${issue.target}-${index}`} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-xs leading-5 text-amber-950">{t(`setupFlow.issues.${issue.code}`, { defaultValue: t("setupFlow.blockedDescription") })}</p>
        {issue.account_code ? <p className="mt-0.5 font-mono text-[11px] text-amber-800/70">{issue.account_code}</p> : null}
      </div>
      <Link to={issue.target} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-amber-900 hover:underline">{t("setupFlow.reviewIssue")}<ArrowRight size={12} aria-hidden="true"/></Link>
    </li>)}
  </ul>;
}

function ConfigCard({ title, description, Icon, enabled, complete, optional, to }: {
  title: string;
  description: string;
  Icon: typeof ListTree;
  enabled: boolean;
  complete: boolean;
  optional?: boolean;
  to: string;
}) {
  const { t } = useTranslation("accountingSettings");
  const tone: Tone = !enabled ? "neutral" : complete ? "success" : optional ? "neutral" : "warning";
  const status = !enabled ? t("setupFlow.blocked") : complete ? t("setupFlow.complete") : optional ? t("setupFlow.available") : t("setupFlow.pending");
  const body = <>
    <div className="flex items-start justify-between gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${enabled ? "border-gray-200 bg-gray-50 text-gray-500" : "border-gray-200 bg-gray-100 text-gray-400"}`}><Icon size={17} aria-hidden="true" /></span>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TONE[tone]}`}>{!enabled ? <LockKeyhole size={10} aria-hidden="true"/> : complete ? <CheckCheck size={10} aria-hidden="true"/> : null}{status}</span>
    </div>
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-gray-500">{description}</p>
    </div>
    {enabled ? <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-gray-600">{t("setupFlow.openStep")}<ArrowRight size={12} aria-hidden="true"/></span> : null}
  </>;
  const className = `flex min-h-36 flex-col gap-3 rounded-lg border p-4 text-left transition-colors ${enabled ? "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-gray-400" : "cursor-not-allowed border-gray-200 bg-gray-50"}`;
  return enabled ? <Link to={to} className={className}>{body}</Link> : <div aria-disabled="true" className={className}>{body}</div>;
}

function QuickAction({ title, description, Icon, to, onClick }: {
  title: string;
  description: string;
  Icon: typeof BookOpen;
  to?: string;
  onClick?: () => void;
}) {
  const className = "group flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400";
  const body = <>
    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500"><Icon size={16} aria-hidden="true"/></span>
    <span className="min-w-0 flex-1">
      <span className="block text-[13px] font-medium text-slate-900">{title}</span>
      <span className="mt-0.5 block text-[11px] leading-5 text-slate-500">{description}</span>
    </span>
    <ArrowRight size={13} className="mt-1.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true"/>
  </>;
  return to ? <Link to={to} className={className}>{body}</Link> : <button type="button" onClick={onClick} className={className}>{body}</button>;
}

function SetupOverview() {
  const { t } = useTranslation("accountingSettings");
  const { status, refresh } = useAccountingSetup();
  const { openSetup } = useAccountingAiSetup();
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");
  if (!status) return <PageSkeleton variant="form" rows={5}/>;

  const chartStep = status.steps.find(step => step.key === "chart");
  const booksStep = status.steps.find(step => step.key === "books");
  const profileReady = chartStep?.available === true;
  const chartComplete = chartStep?.complete === true;
  const booksComplete = booksStep?.complete === true;
  const completed = status.steps.filter(step => step.complete).length;
  const percent = Math.round((completed / Math.max(status.steps.length, 1)) * 100);
  const issues: OverviewIssue[] = status.steps.flatMap(step => step.available ? step.issues.map(issue => ({ code: issue.code, account_code: issue.account_code, target: STEP_TARGET[step.key] })) : []);
  const next = !profileReady
    ? { to: "/settings", label: t("setupFlow.openWorkspaceSettings"), title: t("setupFlow.openWorkspaceSettings"), body: t("setupFlow.currencyPrerequisite") }
    : !chartComplete
      ? { to: "/accounting/chart-of-accounts", label: t("setupFlow.openChart"), title: t("nav.chart"), body: t("setupFlow.descriptions.chart") }
      : !booksComplete
        ? { to: "/accounting/books", label: t("setupFlow.continue"), title: t("nav.books"), body: t("setupFlow.descriptions.books") }
        : null;
  const setupTone: Tone = status.status === "needs_attention" ? "warning" : status.status === "ready" ? "success" : "neutral";
  const activate = async () => {
    if (activating || !status.can_activate) return;
    setActivating(true);
    setActivationError("");
    try {
      await api.activateAccounting(status.revision);
      await refresh();
    } catch {
      setActivationError(t("setupFlow.actionError"));
    } finally {
      setActivating(false);
    }
  };
  const primaryClass = "inline-flex min-h-9 items-center gap-2 rounded-md bg-gray-900 px-3 text-xs font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400";

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("setupFlow.workspace")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{t("setupFlow.setupTitle")}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">{t("setupFlow.setupDescription")}</p>
      </div>
      <StatusPill tone={setupTone}>{t(`setupFlow.states.${status.status}`)}</StatusPill>
    </header>

    {activationError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{activationError}</p> : null}

    <Card as="section" radius="xl" tone="slate" padding="default" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("setupFlow.nextAction")}</p>
          <h2 className="mt-1 text-base font-semibold text-gray-900">{next?.title ?? t("setupFlow.readyTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">{next?.body ?? t("setupFlow.activationConsequences")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {next ? <Link to={next.to} className={primaryClass}>{next.label}<ArrowRight size={14} aria-hidden="true"/></Link>
            : <Button variant="outlineBlack" className="gap-2" onClick={() => void activate()} isLoading={activating} disabled={!status.can_activate}>{t("setupFlow.activate")}<ArrowRight size={14} aria-hidden="true"/></Button>}
          {!chartComplete && !booksComplete && profileReady ? <Button variant="outline" className="gap-2" onClick={() => openSetup("overview")}><Sparkles size={15} aria-hidden="true"/>{t("guidedSetup.questionnaire")}</Button> : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-gray-700">{t("setupFlow.progress")}</span>
          <span className="text-gray-500">{t("setupFlow.completedCount", { count: completed, total: status.steps.length })}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("setupFlow.progress")}>
          <div className="h-full rounded-full bg-gray-900 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }}/>
        </div>
      </div>

      <p className="text-[11px] leading-5 text-gray-500">{t("setupFlow.validationSource")}</p>
    </Card>

    {issues.length ? <section className="space-y-4 rounded-xl border border-amber-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700"><CircleAlert size={18} aria-hidden="true"/></span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{t("setupFlow.requiredActions")}</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">{t("setupFlow.issueCount", { count: issues.length })}</p>
        </div>
      </div>
      <IssueList issues={issues}/>
    </section> : null}

    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t("setupFlow.relatedSetup")}</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">{t("setupFlow.configDescription")}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ConfigCard title={t("nav.chart")} description={t("setupFlow.descriptions.chart")} Icon={ListTree} enabled={profileReady} complete={chartComplete} to="/accounting/chart-of-accounts"/>
        <ConfigCard title={t("nav.books")} description={t("setupFlow.descriptions.books")} Icon={BookOpen} enabled={chartComplete} complete={booksComplete} to="/accounting/books"/>
        <ConfigCard title={t("nav.postingPolicies")} description={t("setupFlow.policyGuidance")} Icon={Route} enabled={status.can_activate} complete={false} optional to="/accounting/posting-policies"/>
        <ConfigCard title={t("nav.bankMappings")} description={t("setupFlow.bankGuidance")} Icon={Landmark} enabled={status.can_activate} complete={false} optional to="/accounting/bank-mappings"/>
      </div>
    </section>
  </section>;
}

function OperationalOverview() {
  const { t, i18n } = useTranslation("accountingSettings");
  const { status } = useAccountingSetup();
  const { openGuide } = useAccountingReviewGuide();
  const [trial, setTrial] = useState<TrialBalanceRow[] | null>(null);
  const [journals, setJournals] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([api.getTrialBalance(), api.getJournalEntries()])
      .then(([trialResponse, journalsResponse]) => {
        if (!active) return;
        setTrial(extractCollection<TrialBalanceRow>(trialResponse.data));
        setJournals(extractCollection<JournalEntry>(journalsResponse));
      })
      .catch(() => { if (active) setError(t("overview.loadError")); });
    return () => { active = false; };
  }, [t, reloadKey]);

  const totals = useMemo(() => (trial || []).reduce((acc, row) => {
    acc.debit += Number(row.debit_minor || 0);
    acc.credit += Number(row.credit_minor || 0);
    return acc;
  }, { debit: 0, credit: 0 }), [trial]);
  const posted = (journals || []).filter(journal => journal.status === "posted");
  const lastPosting = [...posted].sort((a, b) => (b.posting_date || "").localeCompare(a.posting_date || ""))[0]?.posting_date || "";
  const money = (minor: number) => new Intl.NumberFormat(i18n.language, { style: "currency", currency: status?.profile.currency || "EUR" }).format(minor / 100);
  const accountsWithBalances = (trial || []).filter(row => Number(row.debit_minor || 0) || Number(row.credit_minor || 0) || Number(row.balance_minor || 0));
  const accounts = accountsWithBalances.slice(0, 8);
  const journalRows = [...(journals || [])].sort((a, b) => (b.posting_date || "").localeCompare(a.posting_date || "")).slice(0, 5);
  const loading = trial === null || journals === null;
  const issues: OverviewIssue[] = status ? status.steps.flatMap(step => step.available ? step.issues.map(issue => ({ code: issue.code, account_code: issue.account_code, target: STEP_TARGET[step.key] })) : []) : [];
  const metrics = [
    { key: "debits", value: money(totals.debit), Icon: ArrowDownLeft },
    { key: "credits", value: money(totals.credit), Icon: ArrowUpRight },
    { key: "journals", value: String(journals?.length ?? 0), Icon: BookOpen },
    { key: "posted", value: String(posted.length), hint: lastPosting ? t("overview.lastPosting", { date: lastPosting }) : undefined, Icon: CheckCheck },
  ];
  const journalTone = (value: JournalEntry["status"]): Tone => value === "posted" ? "success" : value === "reversed" ? "warning" : value === "error" ? "danger" : "neutral";

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t("setupFlow.workspace")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{t("overview.title")}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{t("overview.description")}</p>
      </div>
      <StatusPill tone="success">{t("setupFlow.states.active")}</StatusPill>
    </header>

    {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
      <span>{error}</span>
      <Button variant="outline" size="sm" onClick={() => { setTrial(null); setJournals(null); setReloadKey(value => value + 1); }}>{t("redesign.retry")}</Button>
    </div> : null}

    {issues.length ? <section className="space-y-4 rounded-xl border border-amber-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700"><CircleAlert size={18} aria-hidden="true"/></span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{t("setupFlow.attention")}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t("setupFlow.issueCount", { count: issues.length })}</p>
        </div>
      </div>
      <IssueList issues={issues}/>
    </section> : null}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ key, value, hint, Icon }) => <AccountingMetricCard key={key} label={t(`overview.metrics.${key}`)} value={value} hint={hint} Icon={Icon} loading={loading}/>)}
    </div>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <Card as="section" radius="xl" tone="slate" padding="none" title={t("overview.trialBalance")} description={t("overview.trialBalanceDescription")} actions={<Link to="/accounting/chart-of-accounts" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">{t("overview.openChart")}<ArrowRight size={12} aria-hidden="true"/></Link>}>
        <div className="p-4 sm:p-5">
          {loading ? <div className="space-y-3">{[1,2,3,4,5].map(key => <SkeletonLine key={key} className="h-7 w-full"/>)}</div>
            : accounts.length ? <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-xs">
                <thead><tr className="border-b border-slate-100">
                  <th scope="col" className="pb-2 pr-3 text-left text-[11px] font-medium text-slate-500">{t("overview.account")}</th>
                  <th scope="col" className="pb-2 pl-3 text-right text-[11px] font-medium text-slate-500">{t("overview.debit")}</th>
                  <th scope="col" className="pb-2 pl-3 text-right text-[11px] font-medium text-slate-500">{t("overview.credit")}</th>
                  <th scope="col" className="pb-2 pl-3 text-right text-[11px] font-medium text-slate-500">{t("overview.balance")}</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map(row => {
                    const debit = Number(row.debit_minor || 0);
                    const credit = Number(row.credit_minor || 0);
                    const balance = Number(row.balance_minor || 0);
                    return <tr key={row.code}>
                      <td className="py-2.5 pr-3"><div className="flex min-w-0 items-center gap-2"><span className="w-14 shrink-0 font-mono text-[11px] text-slate-400">{row.code}</span><span className="truncate text-slate-700">{row.name}</span></div></td>
                      <td className="py-2.5 pl-3 text-right tabular-nums text-slate-600">{debit ? money(debit) : "—"}</td>
                      <td className="py-2.5 pl-3 text-right tabular-nums text-slate-600">{credit ? money(credit) : "—"}</td>
                      <td className={`py-2.5 pl-3 text-right font-medium tabular-nums ${balance < 0 ? "text-rose-600" : "text-slate-900"}`}>{money(balance)}</td>
                    </tr>;
                  })}
                </tbody>
                <tfoot><tr className="border-t border-slate-200">
                  <td colSpan={2} className="py-2.5 pr-3 text-[11px] font-semibold text-slate-700">{t("overview.total")}</td>
                  <td className="py-2.5 pl-3 text-right font-semibold tabular-nums text-slate-900">{money(totals.debit)}</td>
                  <td className="py-2.5 pl-3 text-right font-semibold tabular-nums text-slate-900">{money(totals.credit)}</td>
                  <td className={`py-2.5 pl-3 text-right font-semibold tabular-nums ${totals.debit - totals.credit === 0 ? "text-slate-900" : "text-rose-600"}`}>{money(totals.debit - totals.credit)}</td>
                </tr></tfoot>
              </table>
              {(accountsWithBalances.length) > accounts.length ? <p className="mt-3 text-[11px] text-slate-500">{t("overview.showingAccounts", { shown: accounts.length, total: accountsWithBalances.length })}</p> : null}
            </div> : <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-xs text-slate-500">{t("overview.noBalances")}</p>}
        </div>
      </Card>

      <Card as="section" radius="xl" tone="slate" padding="none" title={t("overview.recentJournals")} actions={<Link to="/accounting/journals" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">{t("overview.viewAll")}<ArrowRight size={12} aria-hidden="true"/></Link>}>
        <div className="p-4 sm:p-5">
          {loading ? <div className="space-y-3">{[1,2,3].map(key => <SkeletonLine key={key} className="h-8 w-full"/>)}</div>
            : journalRows.length ? <ul className="divide-y divide-slate-100">
              {journalRows.map(journal => <li key={journal.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-medium text-slate-900">{journal.entry_number || journal.id}</p>
                    <StatusPill tone={journalTone(journal.status)}>{t(`enums.status.${journal.status}`, journal.status)}</StatusPill>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{journal.memo || journal.book_code} · {journal.posting_date}</p>
                </div>
              </li>)}
            </ul> : <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-xs text-slate-500">{t("overview.noJournals")}</p>}
        </div>
      </Card>
    </div>

    <Card as="section" radius="xl" tone="slate" padding="default" className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{t("overview.quickActions")}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t("overview.quickActionsDescription")}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction title={t("nav.journals")} description={t("overview.quickJournals")} Icon={BookOpen} to="/accounting/journals"/>
        <QuickAction title={t("nav.reconciliation")} description={t("overview.quickReview")} Icon={CheckCheck} onClick={openGuide}/>
        <QuickAction title={t("nav.postingPolicies")} description={t("overview.quickRules")} Icon={Route} to="/accounting/posting-policies"/>
        <QuickAction title={t("nav.bankMappings")} description={t("overview.quickBanks")} Icon={Landmark} to="/accounting/bank-mappings"/>
      </div>
    </Card>
  </section>;
}

export default function AccountingOverviewPage() {
  const { status } = useAccountingSetup();
  if (!status) return <PageSkeleton variant="form" rows={5}/>;
  return status.operational ? <OperationalOverview/> : <SetupOverview/>;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Landmark, ListTree, LockKeyhole, MoreHorizontal, Plus, Route, Sparkles, Upload } from "lucide-react";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import CompactActionMenu from "@/shared/ui/Popover/CompactActionMenu";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import DataTableSkeleton from "@/shared/ui/DataTable/DataTableSkeleton";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import { useAccountingSetup } from "../setup/useAccountingSetup";
import { useAccountingAiSetup } from "../setup/guided/AccountingAiSetupState";
import { useChartAccounts } from "./useChartAccounts";
import { descendantIds, sortAccounts, type AccountView } from "./accountHierarchy";
import ChartOfAccounts from "./ChartOfAccounts";
import ChartFilters from "./ChartFilters";
import { emptyChartFilters } from "./accountFilters";
import AccountInsights, { type AccountInsight } from "./AccountInsights";
import LedgerAccountModal from "./LedgerAccountModal";
import ChartImport from "./ChartImport";

type SetupAction = {
  key: string;
  title: string;
  description: string;
  Icon: typeof Sparkles;
  onClick(): void;
};

export default function ChartOfAccountsPage() {
  const { t } = useTranslation("ledgerAccounts");
  const { t: accounting } = useTranslation("accountingSettings");
  const { status, refresh } = useAccountingSetup();
  const { openSetup } = useAccountingAiSetup();
  const chart = useChartAccounts();
  const [filters, setFilters] = useState(emptyChartFilters);
  const [view, setView] = useState<"accounts" | AccountInsight>("accounts");
  const [display, setDisplay] = useState<AccountView>("tree");
  const [modal, setModal] = useState<{ account: LedgerAccount | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);
  const [deleting, setDeleting] = useState<{ account?: LedgerAccount } | null>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!chart.loading) setReady(true); }, [chart.loading]);
  const filtered = useMemo(() => chart.accounts.filter(account => {
    const query = filters.search.trim().toLocaleLowerCase();
    return (!query || [account.code, account.name, account.description, account.external_ref, account.report_group, account.report_subgroup].some(value => value?.toLocaleLowerCase().includes(query))) &&
      (!filters.section || account.statement_section === filters.section) && (!filters.type || account.account_type === filters.type) &&
      (!filters.bank || String(account.is_bank_control) === filters.bank) && (!filters.manual || String(account.allows_manual_posting) === filters.manual) &&
      (!filters.active || String(account.is_active) === filters.active);
  }).sort(sortAccounts), [chart.accounts, filters]);
  const parents = useMemo(() => {
    const excluded = descendantIds(chart.accounts, modal?.account?.id);
    return chart.accounts.filter(account => !excluded.has(account.id) && account.account_type === "header").sort(sortAccounts).map(account => ({ value: account.id, label: `${account.code} — ${account.name}` }));
  }, [chart.accounts, modal]);
  if (!chart.canView) return <p className="rounded-lg border border-dashed border-gray-300 p-6 text-[13px] text-gray-500 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-700 [&_p]:my-3 [&_p]:leading-6">{accounting("chartPage.noAccess")}</p>;
  if (!ready || !status) return <PageSkeleton variant="accounting" rows={6}/>;

  const empty = !chart.loading && chart.accounts.length === 0;
  const setupActions: SetupAction[] = [
    { key: "guided", title: accounting("guidedSetup.questionnaire", { defaultValue: "Start AI setup" }), description: accounting("chartPage.guidedHint", { defaultValue: "Answer a short questionnaire and preview the suggested chart, books and connections." }), Icon: Sparkles, onClick: () => openSetup("chart") },
    ...(chart.canAdd ? [
      { key: "configure", title: t("setup.submit"), description: accounting("chartPage.configureHint", { defaultValue: "Load the business starter template, upload a file or paste rows." }), Icon: Upload, onClick: () => setImporting(true) },
      { key: "add", title: t("workspace.addAccount"), description: accounting("chartPage.addHint", { defaultValue: "Create accounts one at a time when you already know the structure." }), Icon: Plus, onClick: () => setModal({ account: null }) },
    ] : []),
  ];

  return <section className="min-w-0 space-y-5">
    {empty && !importing && <Card as="section" radius="xl" tone="slate" padding="default" className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gray-200 bg-white text-gray-600"><ListTree size={19} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-gray-900">{accounting("chartPage.emptyTitle", { defaultValue: "Start your chart of accounts" })}</h1>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-gray-500">{accounting("setupFlow.descriptions.chart")}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {setupActions.map(({ key, title, description, Icon, onClick }) => <button key={key} type="button" onClick={onClick} className="group flex min-h-20 items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-gray-400">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-500 transition-colors group-hover:text-gray-700"><Icon size={16} aria-hidden="true" /></span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-gray-900">{title}</span>
            <span className="mt-0.5 block text-[11px] leading-5 text-gray-500">{description}</span>
          </span>
        </button>)}
      </div>
    </Card>}

    {!empty && !chart.loading && <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-xl text-xs leading-5 text-gray-500">{accounting("chartPage.description")}</p>
      <div className="flex items-center gap-2">
        {chart.canAdd && <Button variant="outline" className="gap-2" onClick={() => setModal({ account: null })}><Plus size={15} aria-hidden="true" />{t("workspace.addAccount")}</Button>}
        {chart.canDelete && <Button ref={menuRef} variant="outline" aria-label={t("workspace.moreActions")} aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={16} aria-hidden="true" /></Button>}
      </div>
    </div>}

    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{accounting("chartPage.relatedSetup", { defaultValue: "Related setup" })}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { page: "books", key: "books", Icon: BookOpen, enabled: status?.steps.find(step => step.key === "books")?.available === true },
          { page: "posting-policies", key: "postingPolicies", Icon: Route, enabled: status?.can_activate === true },
          { page: "bank-mappings", key: "bankMappings", Icon: Landmark, enabled: status?.can_activate === true },
        ].map(({ page, key, Icon, enabled }) => enabled ? <Link key={page} to={`/accounting/${page}`} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"><Icon size={16} className="text-gray-400" aria-hidden="true"/>{accounting(`nav.${key}`)}<ArrowRight size={13} className="ml-auto text-gray-400" aria-hidden="true"/></Link>
          : <span key={page} aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-400"><LockKeyhole size={16} aria-hidden="true"/>{accounting(`nav.${key}`)}</span>)}
      </div>
    </div>

    {importing && chart.canAdd && status ? <ChartImport compact={status.profile.mode === "personal"} embedded onCancel={() => setImporting(false)} onSuccess={async () => { setImporting(false); await chart.reload(); await refresh(); }} /> : null}

    <CompactActionMenu open={menu} onClose={() => setMenu(false)} anchor={menuRef}><button type="button" className="w-full rounded px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" onClick={() => { setMenu(false); setDeleting({}); }}>{t("workspace.deleteAll")}</button></CompactActionMenu>
    {chart.accounts.length > 0 && <><SegmentedControl<"accounts" | AccountInsight> tabs id="chart-views" value={view} label={accounting("setupFlow.chartViews")} onChange={setView} items={(["accounts", "posting-controls", "bank-control", "reporting"] as const).map(value=>({value,panelId:"chart-view-panel",label:t(value === "accounts" ? "explorer.accounts" : value === "posting-controls" ? "workspace.managementPostingControlsTitle" : value === "bank-control" ? "workspace.managementBankControlTitle" : "workspace.managementReportingTitle")}))} />
    <ChartFilters onApply={setFilters} /></>}
    {chart.error !== null && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm"><p>{chart.error || t("workspace.requestError")}</p><Button variant="outline" onClick={() => void chart.reload()}>{accounting("redesign.retry")}</Button></div>}
    <div id="chart-view-panel" role="tabpanel" aria-labelledby={`chart-views-${view}`} tabIndex={0} className="min-w-0 focus-visible:outline-2 focus-visible:outline-indigo-500">
    {chart.loading ? <DataTableSkeleton rows={6} /> : chart.accounts.length > 0 ? view === "accounts" ? <ChartOfAccounts items={filtered} allAccounts={chart.accounts} viewMode={display} onViewModeChange={setDisplay} onEdit={chart.canEdit ? account => setModal({ account }) : undefined} onDelete={chart.canDelete ? account => setDeleting({ account }) : undefined} /> : <AccountInsights filters={filters} view={view} onEdit={chart.canEdit ? account => setModal({ account }) : undefined} onDelete={chart.canDelete ? async account => { if (!await chart.remove(account)) throw new Error(t("workspace.requestError")); await refresh(); } : undefined} /> : !chart.canAdd && <p className="rounded-lg border border-dashed border-gray-300 p-6 text-[13px] text-gray-500 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-700 [&_p]:my-3 [&_p]:leading-6">{t("workspace.emptyTitle")}</p>}
    </div>
    <LedgerAccountModal isOpen={!!modal} mode={modal?.account ? "edit" : "create"} initial={modal?.account} parentOptions={parents} busy={chart.busy} onClose={() => { if (!chart.busy) setModal(null); }} onSubmit={async payload => { if (await chart.save(modal?.account ?? null, payload)) { setModal(null); await refresh(); } else throw new Error(t("workspace.requestError")); }} />
    <ConfirmToast open={!!deleting} variant="danger" busy={chart.busy} text={deleting?.account ? `${t("workspace.delete")} ${deleting.account.code} — ${deleting.account.name}?` : t("workspace.deleteAllConfirm")} confirmLabel={t("workspace.delete")} cancelLabel={accounting("common.cancel")} onCancel={() => setDeleting(null)} onConfirm={() => { void chart.remove(deleting?.account).then(done => { if (done) setDeleting(null); }); }} />
  </section>;
}

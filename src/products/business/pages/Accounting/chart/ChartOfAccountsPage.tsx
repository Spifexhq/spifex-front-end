import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Compass, MoreHorizontal, Sparkles } from "lucide-react";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import ProductTour, { type ProductTourStep } from "@/shared/ui/ProductTour";
import CompactActionMenu from "@/shared/ui/Popover/CompactActionMenu";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import DataTableSkeleton from "@/shared/ui/DataTable/DataTableSkeleton";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import { useAccountingSetup } from "../setup/useAccountingSetup";
import { useChartAccounts } from "./useChartAccounts";
import { descendantIds, sortAccounts, type AccountView } from "./accountHierarchy";
import ChartOfAccounts from "./ChartOfAccounts";
import ChartFilters from "./ChartFilters";
import { emptyChartFilters } from "./accountFilters";
import AccountInsights, { type AccountInsight } from "./AccountInsights";
import LedgerAccountModal from "./LedgerAccountModal";
import ChartImport from "./ChartImport";

export default function ChartOfAccountsPage() {
  const { t } = useTranslation("ledgerAccounts");
  const { t: accounting } = useTranslation("accountingSettings");
  const { status, refresh } = useAccountingSetup();
  const chart = useChartAccounts();
  const [filters, setFilters] = useState(emptyChartFilters);
  const [view, setView] = useState<"accounts" | AccountInsight>("accounts");
  const [display, setDisplay] = useState<AccountView>("tree");
  const [modal, setModal] = useState<{ account: LedgerAccount | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const [menu, setMenu] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [deleting, setDeleting] = useState<{ account?: LedgerAccount } | null>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
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
  const tourSteps: ProductTourStep[] = [
    {
      target: '[data-tour="chart-intro"]',
      title: accounting("guidedSetup.tour.introTitle", { defaultValue: "Your chart of accounts" }),
      body: accounting("guidedSetup.tour.introBody", { defaultValue: "This list is the backbone of your accounting. A clear chart makes every entry, report and bank import easier." }),
    },
    {
      target: '[data-tour="chart-actions"]',
      title: accounting("guidedSetup.tour.actionsTitle", { defaultValue: "Add accounts your way" }),
      body: accounting("guidedSetup.tour.actionsBody", { defaultValue: "Create a single account, or import a CSV/XLSX list. You can edit or remove accounts later." }),
    },
    {
      target: '[data-tour="chart-list"]',
      title: accounting("guidedSetup.tour.listTitle", { defaultValue: "Review and adjust" }),
      body: accounting("guidedSetup.tour.listBody", { defaultValue: "Search, filter and group accounts. Headers organise the tree; posting accounts receive entries." }),
    },
    {
      target: '[data-tour="chart-ai"]',
      title: accounting("guidedSetup.tour.aiTitle", { defaultValue: "Prefer a guided start?" }),
      body: accounting("guidedSetup.tour.aiBody", { defaultValue: "Answer a short questionnaire in your language and preview a suggested chart before applying it." }),
    },
  ];
  return <section className="min-w-0 space-y-4">
    <Card as="section" radius="xl" tone="slate" padding="default" data-tour="chart-ai" className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600"><Sparkles size={18} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{accounting("guidedSetup.title", { defaultValue: "Set up with guidance" })}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{accounting("guidedSetup.body", { defaultValue: "New to accounting or short on time? Take the tour, or let a guided questionnaire suggest a chart of accounts in your language." })}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setTourOpen(true)} className="inline-flex items-center gap-2"><Compass size={15} aria-hidden="true" />{accounting("guidedSetup.takeTour", { defaultValue: "Take the tour" })}</Button>
        <Link to="/accounting/setup/guide" className="inline-flex min-h-8 items-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800"><Sparkles size={15} aria-hidden="true" />{accounting("guidedSetup.questionnaire", { defaultValue: "Guided questionnaire" })}</Link>
      </div>
    </Card>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p data-tour="chart-intro" className="max-w-xl text-xs leading-5 text-gray-500">{accounting("chartPage.description")}</p>
      <div data-tour="chart-actions" className="flex items-center gap-2">
        {chart.canAdd && <>{chart.accounts.length > 0 && <Button variant="outline" onClick={() => setImporting(!importing)}>{accounting("setupFlow.importAccounts")}</Button>}<Button onClick={() => setModal({ account: null })}>{t("workspace.addAccount")}</Button></>}
        {chart.canDelete && chart.accounts.length > 0 && <Button ref={menuRef} variant="outline" aria-label={t("workspace.moreActions")} aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={16} aria-hidden="true" /></Button>}
      </div>
    </div>
    <CompactActionMenu open={menu} onClose={() => setMenu(false)} anchor={menuRef}><button type="button" className="w-full rounded px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" onClick={() => { setMenu(false); setDeleting({}); }}>{t("workspace.deleteAll")}</button></CompactActionMenu>
    {(importing || (!chart.loading && !chart.accounts.length && chart.error === null)) && chart.canAdd && status && <ChartImport ledgerMode={status.profile.mode} compact={status.profile.mode === "personal"} embedded onSuccess={async () => { setImporting(false); await chart.reload(); await refresh(); }} />}
    {chart.accounts.length > 0 && <><SegmentedControl<"accounts" | AccountInsight> tabs id="chart-views" value={view} label={accounting("setupFlow.chartViews")} onChange={setView} items={(["accounts", "posting-controls", "bank-control", "reporting"] as const).map(value=>({value,panelId:"chart-view-panel",label:t(value === "accounts" ? "explorer.accounts" : value === "posting-controls" ? "workspace.managementPostingControlsTitle" : value === "bank-control" ? "workspace.managementBankControlTitle" : "workspace.managementReportingTitle")}))} />
    <ChartFilters onApply={setFilters} /></>}
    {chart.error !== null && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm"><p>{chart.error || t("workspace.requestError")}</p><Button variant="outline" onClick={() => void chart.reload()}>{accounting("redesign.retry")}</Button></div>}
    <div id="chart-view-panel" data-tour="chart-list" role="tabpanel" aria-labelledby={`chart-views-${view}`} tabIndex={0} className="min-w-0 focus-visible:outline-2 focus-visible:outline-indigo-500">
    {chart.loading ? <DataTableSkeleton rows={6} /> : chart.accounts.length > 0 ? view === "accounts" ? <ChartOfAccounts items={filtered} allAccounts={chart.accounts} viewMode={display} onViewModeChange={setDisplay} onEdit={chart.canEdit ? account => setModal({ account }) : undefined} onDelete={chart.canDelete ? account => setDeleting({ account }) : undefined} /> : <AccountInsights filters={filters} view={view} onEdit={chart.canEdit ? account => setModal({ account }) : undefined} onDelete={chart.canDelete ? async account => { if (!await chart.remove(account)) throw new Error(t("workspace.requestError")); await refresh(); } : undefined} /> : !chart.canAdd && <p className="rounded-lg border border-dashed border-gray-300 p-6 text-[13px] text-gray-500 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-700 [&_p]:my-3 [&_p]:leading-6">{t("workspace.emptyTitle")}</p>}
    </div>
    <LedgerAccountModal isOpen={!!modal} mode={modal?.account ? "edit" : "create"} initial={modal?.account} parentOptions={parents} busy={chart.busy} onClose={() => { if (!chart.busy) setModal(null); }} onSubmit={async payload => { if (await chart.save(modal?.account ?? null, payload)) { setModal(null); await refresh(); } else throw new Error(t("workspace.requestError")); }} />
    <ConfirmToast open={!!deleting} variant="danger" busy={chart.busy} text={deleting?.account ? `${t("workspace.delete")} ${deleting.account.code} — ${deleting.account.name}?` : t("workspace.deleteAllConfirm")} confirmLabel={t("workspace.delete")} cancelLabel={accounting("common.cancel")} onCancel={() => setDeleting(null)} onConfirm={() => { void chart.remove(deleting?.account).then(done => { if (done) setDeleting(null); }); }} />
    <ProductTour open={tourOpen} steps={tourSteps} onClose={() => setTourOpen(false)} />
  </section>;
}

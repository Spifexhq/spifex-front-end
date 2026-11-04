import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal } from "lucide-react";
import Button from "@/shared/ui/Button";
import Popover from "@/shared/ui/Popover";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
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
  return <section className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-xl text-xs leading-5 text-gray-500">{accounting("chartPage.description")}</p>
      <div className="flex items-center gap-2">
        {chart.canAdd && <>{chart.accounts.length > 0 && <Button variant="outline" onClick={() => setImporting(!importing)}>{accounting("setupFlow.importAccounts")}</Button>}<Button onClick={() => setModal({ account: null })}>{t("workspace.addAccount")}</Button></>}
        {chart.canDelete && chart.accounts.length > 0 && <Button ref={menuRef} variant="outline" aria-label={t("workspace.moreActions")} aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={16} /></Button>}
      </div>
    </div>
    <Popover open={menu} onClose={() => setMenu(false)} anchorRef={menuRef} title={t("workspace.moreActions")} width={240}><button type="button" className="w-full rounded px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" onClick={() => { setMenu(false); setDeleting({}); }}>{t("workspace.deleteAll")}</button></Popover>
    {(importing || (!chart.loading && !chart.accounts.length && chart.error === null)) && chart.canAdd && status && <ChartImport ledgerMode={status.profile.mode} compact={status.profile.mode === "personal"} embedded onSuccess={async () => { setImporting(false); await chart.reload(); await refresh(); }} />}
    {chart.accounts.length > 0 && <><nav className="flex gap-1 overflow-x-auto border-b border-gray-200" aria-label={accounting("setupFlow.chartViews")}>
      {(["accounts", "posting-controls", "bank-control", "reporting"] as const).map(item => <button type="button" key={item} aria-pressed={view === item} onClick={() => setView(item)} className={`shrink-0 border-b-2 px-3 py-2.5 text-xs ${view === item ? "border-gray-900 font-medium text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`}>{t(item === "accounts" ? "explorer.accounts" : item === "posting-controls" ? "workspace.managementPostingControlsTitle" : item === "bank-control" ? "workspace.managementBankControlTitle" : "workspace.managementReportingTitle")}</button>)}
    </nav>
    <ChartFilters onApply={setFilters} /></>}
    {chart.error !== null && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm"><p>{chart.error || t("workspace.requestError")}</p><Button variant="outline" onClick={() => void chart.reload()}>{accounting("redesign.retry")}</Button></div>}
    {chart.loading ? <PageSkeleton rows={6} /> : chart.accounts.length > 0 ? view === "accounts" ? <ChartOfAccounts items={filtered} allAccounts={chart.accounts} viewMode={display} onViewModeChange={setDisplay} onEdit={chart.canEdit ? account => setModal({ account }) : undefined} onDelete={chart.canDelete ? account => setDeleting({ account }) : undefined} /> : <AccountInsights accounts={filtered} view={view} /> : !chart.canAdd && <p className="rounded-lg border border-dashed border-gray-300 p-6 text-[13px] text-gray-500 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-700 [&_p]:my-3 [&_p]:leading-6">{t("workspace.emptyTitle")}</p>}
    <LedgerAccountModal isOpen={!!modal} mode={modal?.account ? "edit" : "create"} initial={modal?.account} parentOptions={parents} busy={chart.busy} onClose={() => { if (!chart.busy) setModal(null); }} onSubmit={async payload => { if (await chart.save(modal?.account ?? null, payload)) { setModal(null); await refresh(); } else throw new Error(t("workspace.requestError")); }} />
    <ConfirmToast open={!!deleting} variant="danger" busy={chart.busy} text={deleting?.account ? `${t("workspace.delete")} ${deleting.account.code} — ${deleting.account.name}?` : t("workspace.deleteAllConfirm")} confirmLabel={t("workspace.delete")} cancelLabel={accounting("common.cancel")} onCancel={() => setDeleting(null)} onConfirm={() => { void chart.remove(deleting?.account).then(done => { if (done) setDeleting(null); }); }} />
  </section>;
}

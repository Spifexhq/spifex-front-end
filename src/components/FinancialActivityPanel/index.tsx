import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, ChevronDown, Settings2, Save, Eye, Star, ArrowUpRight, Landmark } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "@/middlewares";
import Button from "@/shared/ui/Button";
import InfoTooltip from "@/shared/ui/InfoTooltip";
import { formatCurrency } from "@/lib";
import type { EntryFilters } from "@/models/components/filterBar";
import { useActivityFilters } from "./useActivityFilters";
import { useActivityMetrics } from "./useActivityMetrics";
import { useBankBalances } from "./useBankBalances";
import { ChipsSearchBar } from "./sections/ChipsSearchBar";
import { Chip } from "./ui/Chip";
import { Menu } from "./ui/Menu";
import { Popover } from "./ui/Popover";
import { SaveViewModal } from "./modals/SaveViewModal";
import { ViewsConfigModal } from "./modals/ViewsConfigModal";

function getInitials(name: string) {
  if (!name) return "BK";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** The single Cash flow / Settled panel; hooks isolate API and filter logic. */
export default function FinancialActivityPanel({ children, filters, onApply, contextSettlement, refreshToken = 0, banksRefreshKey = 0, shortcutsEnabled = true }: {
 children: ReactNode; filters: EntryFilters; onApply(payload: {filters: EntryFilters}): void;
 contextSettlement: boolean; refreshToken?: number; banksRefreshKey?: number; shortcutsEnabled?: boolean;
}) {
 const { t } = useTranslation(["filterBar", "kpiCards", "banksTable"]);
 const navigate = useNavigate();
 const auth = useAuthContext();
 const canView = (permission: string) => auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
 const showBanks = canView("view_bank");
 const showMetrics = canView(contextSettlement ? "view_settlement_kpis" : "view_cash_flow_kpis");
 const showFilters = canView("view_filters");
 const { metrics, loading, error, retry } = useActivityMetrics({filters, contextSettlement, refreshToken, enabled: showMetrics});
 const { state: bankState, ids: bankIds, sorted: bankRows, totalFmt: bankTotal, retryBanks } = useBankBalances(filters.bank_id, banksRefreshKey, showBanks);
 const [expanded, setExpanded] = useState(false);
 const detailsId = useId();
 const reduced = useReducedMotion();
 const {
   isMobile, localFilters, setLocalFilters, filterDefs,
   setOpenEditor, addFilterMenuOpen, setAddFilterMenuOpen, viewsMenuOpen,
   setViewsMenuOpen, addFilterMenuRef, viewsMenuRef, configPermission,
   editorAnchorRef, searchInputRef, configModalOpen, setConfigModalOpen,
   saveModalOpen, setSaveModalOpen, selectedBanks, selectedCategories,
   categoriesForPicker, hasActiveFilters, activeFiltersCount, canApply,
   tryApplyCurrentFilters, closeEditorsAndApply, clearAll, applyViewToForm,
   addFilterItems, activeEditorDef, scopedViews, refreshViews,
   bankOptions, removeChip,
 } = useActivityFilters({initial: filters, onApply, contextSettlement, shortcutsEnabled, enabled: showFilters});
 return <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
  {(showBanks || showMetrics) && <div className="shrink-0 overflow-hidden">
    <section aria-label={t("kpiCards:overview.title")} className="min-w-0">
      <div className="flex items-center gap-1 px-4 pt-3 sm:px-5">
        <h2 className="text-xs font-semibold text-gray-600">{t("kpiCards:overview.title")}</h2>
        <InfoTooltip label={t("kpiCards:overview.scopeLabel")}>
          {t(contextSettlement ? "kpiCards:overview.settledScope" : "kpiCards:overview.cashflowScope")}
        </InfoTooltip>
      </div>
      <div className={`grid ${showBanks && showMetrics ? "grid-cols-2 xl:grid-cols-4" : showMetrics ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1"}`}>
        {showBanks && <>
    <div className="min-w-0 px-4 py-3 sm:px-5">
      <div className="text-xs leading-5 text-gray-500">{t("kpiCards:panel.consolidatedBalance")}</div>
      <PermissionMiddleware codeName="view_consolidated_balance">
        <div aria-busy={bankState.loading} className="mt-1 whitespace-nowrap text-base font-semibold leading-7 tracking-tight text-gray-900 tabular-nums sm:text-2xl">
          {bankState.loading || bankState.error ? "—" : bankTotal}
        </div>
      </PermissionMiddleware>
      <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={detailsId}
        className="mt-1 inline-flex min-h-7 max-w-full items-center gap-1 rounded text-[11px] font-medium text-gray-600 transition-colors hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]">
        <span>{bankState.error ? t("banksTable:details") : t("kpiCards:panel.accountsCount", { count: bankState.loading ? 0 : bankState.count })}</span>
        <ChevronDown size={13} aria-hidden className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
      </button>
      <p className="hidden text-[11px] leading-4 text-gray-400 sm:block">{t(bankIds.length ? "banksTable:balanceScope" : "banksTable:allAccountsScope")}</p>
    </div>
    <AnimatePresence initial={false}>
      {expanded && <motion.section id={detailsId} key="bank-details" aria-label={t("banksTable:aria.section")}
        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        transition={{ duration: reduced ? 0 : .16, ease: "easeOut" }}
        className="order-last col-span-full min-w-0 overflow-hidden border-t border-gray-100 bg-gray-50/40">
        <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-700"><Landmark size={14} aria-hidden />{t("banksTable:aria.section")}</h3>
          <button type="button" onClick={() => navigate("/settings/banks")}
            className="inline-flex items-center gap-1 rounded py-1 text-[11px] font-medium text-gray-600 hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]">
            {t("banksTable:manage")}<ArrowUpRight size={12} aria-hidden />
          </button>
        </div>
        <div className="max-h-[min(11rem,20dvh)] overflow-y-auto overscroll-contain px-4 pb-2 sm:px-5">
          {bankState.loading ? <p role="status" className="py-4 text-xs text-gray-500">{t("banksTable:aria.loading")}</p>
          : bankState.error ? <div role="status" className="flex items-center justify-between gap-3 py-3"><p className="text-xs text-red-700">{bankState.error}</p><Button variant="outline" size="xs" onClick={() => retryBanks()}>{t("kpiCards:overview.retry")}</Button></div>
          : !bankRows.length ? <p className="py-4 text-xs text-gray-500">{t("banksTable:empty")}</p>
          : <ul className="divide-y divide-gray-100">{bankRows.map(bank => <li key={bank.id} className="flex items-center justify-between gap-3 py-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-[10px] font-semibold text-gray-500">{getInitials(bank.institution)}</span>
              <div className="min-w-0"><div className="truncate text-xs font-medium text-gray-800">{bank.institution}</div>
                <div className="truncate text-[11px] text-gray-500">{bank.iban || t("banksTable:labels.branchAccount", { branch: bank.branch || "—", account: bank.account_number || "—" })}</div>
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-gray-800 tabular-nums">{formatCurrency(Number(bank.consolidated_balance || 0))}</span>
          </li>)}</ul>}
        </div>
      </motion.section>}
    </AnimatePresence>
</>}
        {showMetrics && (error ? (
          <div role="status" className="col-span-full flex flex-wrap items-center justify-between gap-2 px-5 py-4 xl:col-span-3">
            <span className="text-xs text-red-700">{t("kpiCards:overview.loadError")}</span>
            <Button variant="outline" size="xs" onClick={retry}>{t("kpiCards:overview.retry")}</Button>
          </div>
        ) : metrics.map((metric) => (
          <div key={metric.key} aria-busy={loading} className="min-w-0 border-l border-gray-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-1 text-xs leading-5 text-gray-500"><span>{metric.label}</span><span className="inline-flex sm:hidden"><InfoTooltip label={metric.label}>{metric.hint}{metric.delta ? ` · ${metric.delta.value}` : ""}</InfoTooltip></span></div>
            <div className="mt-1 whitespace-nowrap text-base font-semibold leading-7 tracking-tight text-gray-900 tabular-nums sm:text-2xl">
              {loading ? <span className="text-gray-300">—</span> : metric.value}
            </div>
            {metric.delta && !loading && <div className={`mt-1 hidden text-[11px] font-medium sm:block ${metric.delta.positive ? "text-emerald-700" : "text-rose-700"}`}>{metric.delta.value}</div>}
            {metric.hint && <p className="mt-1 hidden text-[11px] leading-4 text-gray-500 sm:block">{loading ? t("kpiCards:loading") : metric.hint}</p>}
          </div>
        )))}
      </div>
    </section>
  </div>}
  {showFilters && <div className="shrink-0">
<div className="relative min-w-0 border-y border-gray-200 bg-white px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <ChipsSearchBar t={t} localFilters={localFilters} searchInputRef={searchInputRef}
          onSearchEnter={() => void tryApplyCurrentFilters()}
          onSearchChange={value => setLocalFilters(prev => ({ ...prev, description: value }))} />
        <div className="relative" ref={addFilterMenuRef}>
          <Button variant="outline" size="sm" className="gap-1.5 bg-white" aria-haspopup="menu" aria-expanded={addFilterMenuOpen}
            onClick={() => { setOpenEditor(null); setViewsMenuOpen(false); setAddFilterMenuOpen(value => !value); }}>
            <SlidersHorizontal size={13} aria-hidden />{t("filterBar:buttons.toggleFilters")}
            {activeFiltersCount > 0 && <span className="rounded bg-gray-100 px-1.5 text-[10px] text-gray-600">{activeFiltersCount}</span>}
          </Button>
          {addFilterMenuOpen && <Menu anchorRef={addFilterMenuRef} roleLabel={t("filterBar:menu.aria")} items={addFilterItems}
            onClose={() => setAddFilterMenuOpen(false)} onAfterAction={() => setAddFilterMenuOpen(false)} />}
        </div>
        <Button variant="outlineBlack" size="sm" disabled={!canApply} onClick={() => void tryApplyCurrentFilters()}>{t("filterBar:buttons.apply")}</Button>
        <div className="ml-auto flex items-center gap-1">
          <PermissionMiddleware codeName={configPermission}>
            <div className="relative" ref={viewsMenuRef}>
              <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t("filterBar:buttons.views")} aria-haspopup="menu" aria-expanded={viewsMenuOpen}
                onClick={() => { setOpenEditor(null); setAddFilterMenuOpen(false); setViewsMenuOpen(value => !value); }}>
                <Eye size={14} aria-hidden /><span className="hidden sm:inline">{t("filterBar:buttons.views")}</span><ChevronDown size={12} className="hidden sm:block" aria-hidden />
              </Button>
              {viewsMenuOpen && <Menu anchorRef={viewsMenuRef} roleLabel={t("filterBar:viewsMenu.aria")} align="right"
                emptyLabel={t("filterBar:viewsMenu.empty")} onClose={() => setViewsMenuOpen(false)}
                items={scopedViews.map(view => ({ key: view.id, label: <span className="flex w-full items-center justify-between gap-2"><span className="truncate">{view.name}</span>{view.is_default && <Star size={12} className="shrink-0 text-amber-500" aria-hidden />}</span>, onAction: () => applyViewToForm(view) }))} />}
            </div>
          </PermissionMiddleware>
          <PermissionMiddleware codeName="add_entry_view">
            <Button variant="ghost" size="iconSm" aria-label={t("filterBar:buttons.saveView")} title={t("filterBar:buttons.saveView")} onClick={() => setSaveModalOpen(true)}><Save size={14} aria-hidden /></Button>
          </PermissionMiddleware>
          <PermissionMiddleware codeName={configPermission}>
            <Button variant="ghost" size="iconSm" aria-label={t("filterBar:buttons.config")} title={t("filterBar:buttons.config")} onClick={() => setConfigModalOpen(true)}><Settings2 size={14} aria-hidden /></Button>
          </PermissionMiddleware>
        </div>
      </div>
      {(hasActiveFilters || canApply) && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {filterDefs.filter(def => def.isActive(localFilters)).map(def => <Chip key={def.key} t={t} icon={def.icon}
          label={def.getChipLabel({ t, filters: localFilters, selectedBanks, selectedCategories })}
          onClick={event => { editorAnchorRef.current = event.currentTarget; setOpenEditor(current => current === def.key ? null : def.key); setAddFilterMenuOpen(false); setViewsMenuOpen(false); }}
          onRemove={() => removeChip(def.key)} />)}
        {hasActiveFilters && <button type="button" onClick={clearAll} className="rounded px-1.5 py-1 text-[11px] text-gray-500 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]">{t("filterBar:buttons.clear")}</button>}
        {canApply && <span role="status" className="ml-auto text-[11px] text-amber-700">{t("filterBar:pendingChanges")}</span>}
      </div>}
      {activeEditorDef && <Popover key={activeEditorDef.key} anchorRef={editorAnchorRef} isMobile={isMobile}
        title={t(activeEditorDef.editorTitleKey)} onClose={() => setOpenEditor(null)} className={activeEditorDef.popoverClassName}>
        <activeEditorDef.Editor t={t} isMobile={isMobile} localFilters={localFilters} setLocalFilters={setLocalFilters}
          bankOptions={bankOptions} selectedBanks={selectedBanks} categoriesForPicker={categoriesForPicker}
          selectedCategories={selectedCategories} onRemove={() => { removeChip(activeEditorDef.key); setOpenEditor(null); }} onApply={closeEditorsAndApply} />
      </Popover>}
          <ViewsConfigModal
            t={t}
            open={configModalOpen}
            onClose={() => setConfigModalOpen(false)}
            scopedViews={scopedViews}
            onApplyViewToForm={applyViewToForm}
            onRefreshViews={refreshViews}
          />

          <SaveViewModal
            t={t}
            open={saveModalOpen}
            onClose={() => setSaveModalOpen(false)}
            scopedViews={scopedViews}
            localFilters={localFilters}
            onRefreshViews={refreshViews}
          />
    </div>
  </div>}
  <div className="min-h-0 flex-1 [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none [&>section]:rounded-none [&>section]:border-0 [&>section]:shadow-none">{children}</div>
 </div>;
}

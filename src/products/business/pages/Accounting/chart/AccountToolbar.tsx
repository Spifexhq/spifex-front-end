import SegmentedControl from "@/shared/ui/SegmentedControl";
import { useTranslation } from "react-i18next";
import { ChevronsDownUp, ChevronsUpDown, ListTree, List } from "lucide-react";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import { accountSections, type AccountView } from "./accountHierarchy";
type Props = { filtered: LedgerAccount[]; viewMode: AccountView; section: string; setSection(value: string): void; expandAll(): void; collapseAll(): void; onViewModeChange(view: AccountView): void };
export default function AccountToolbar({ filtered, viewMode, section, setSection, expandAll, collapseAll, onViewModeChange }: Props) {
  const { t } = useTranslation("ledgerAccounts");
  const { t: accounting } = useTranslation("accountingSettings");
  const sectionLabel = (value: string) => accounting(`common.sections.${value === "off_balance" ? "offBalance" : value}`);
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-gray-500"><span className="font-semibold text-gray-900">{t("explorer.accounts", "Accounts")}</span><span className="rounded bg-gray-100 px-1.5 py-0.5 tabular-nums">{filtered.length}</span><span className="hidden sm:inline">{t("explorer.postingCount", "{{count}} posting accounts", { count: filtered.filter(item => item.account_type === "posting").length })}</span></div>
      <div className="flex items-center gap-1">
        {viewMode === "tree" && <><button type="button" onClick={() => expandAll()} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-gray-400" title={t("explorer.expandAll", "Expand all")} aria-label={t("explorer.expandAll", "Expand all")}><ChevronsUpDown size={15} aria-hidden="true" /></button><button type="button" onClick={() => collapseAll()} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-gray-400" title={t("explorer.collapseAll", "Collapse all")} aria-label={t("explorer.collapseAll", "Collapse all")}><ChevronsDownUp size={15} aria-hidden="true" /></button><span className="mx-2 h-4 border-l border-gray-200" /></>}
        <SegmentedControl<AccountView> value={viewMode} onChange={onViewModeChange} label={t("explorer.accounts")} items={(["tree", "list"] as const).map(value=>({value,label:<span className="inline-flex items-center gap-1.5">{value === "tree" ? <ListTree size={15} aria-hidden="true" /> : <List size={15} aria-hidden="true" />} {t(value === "tree" ? "workspace.viewTree" : "workspace.viewList")}</span>}))}/>

      </div>
    </div>
    <div className="account-facets flex gap-1 overflow-x-auto border-b border-gray-200 px-3 py-2" aria-label={t("modal.statementSection")}>
      <SegmentedControl value={section} onChange={setSection} label={t("modal.statementSection")} items={["", ...accountSections].map(value=>({value,label:value ? sectionLabel(value) : t("explorer.allAccounts")}))}/>

    </div>
  </>;
}

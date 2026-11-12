import { useAccountingRecords } from "@/products/business/hooks/useAccountingRecords";
import type { AccountFilters } from "./accountFilters";
import { useTranslation } from "react-i18next";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import DataTable from "@/shared/ui/DataTable";
import Button from "@/shared/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AccountingStatus from "../components/AccountingStatus";
export type AccountInsight = "posting-controls" | "bank-control" | "reporting";
export default function AccountInsights({ filters, view, onEdit, onDelete }: { filters: AccountFilters; view: AccountInsight; onEdit?: (account: LedgerAccount) => void; onDelete?: (account: LedgerAccount) => Promise<unknown> }) {
 const { t } = useTranslation("ledgerAccounts"); const { t: accounting } = useTranslation("accountingSettings");
 const { t: common } = useTranslation("common");
 const query = { ...filters, view };
 const pager = useAccountingRecords<LedgerAccount>("accounts", query);
 const groups = useAccountingRecords<{ id: string; name: string; count: number }>(view === "reporting" ? "reporting-groups" : undefined, query);
 return <div className="space-y-4">
 {pager.error && <p role="alert" className="text-sm text-red-700">{pager.error}</p>}
 {view === "reporting" && <section aria-label={t("modal.reportGroup")} className="space-y-3">
   {groups.error && <p role="alert" className="text-xs text-red-700">{groups.error}</p>}
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={groups.loading}>
     {groups.items.map(group => <article key={group.id} className="min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-3">
       <h3 className="truncate text-xs font-medium text-gray-500" title={group.name}>{group.name || t("workspace.unassigned")}</h3>
       <p className="mt-2 text-xl font-semibold tracking-tight text-gray-900 tabular-nums">{group.count}</p>
       <p className="mt-1 text-[11px] text-gray-500">{t("workspace.summaryTotal")}</p>
     </article>)}
   </div>
   {!groups.loading && !groups.error && !groups.items.length && <p className="text-xs text-gray-500">{t("workspace.emptyTitle")}</p>}
   {(groups.canPrev || groups.canNext) && <div className="flex justify-end gap-1"><Button variant="ghost" size="iconSm" aria-label={common("pagination.previous")} disabled={!groups.canPrev} onClick={() => void groups.prev()}><ChevronLeft size={15} aria-hidden="true" /></Button><Button variant="ghost" size="iconSm" aria-label={common("pagination.next")} disabled={!groups.canNext} onClick={() => void groups.next()}><ChevronRight size={15} aria-hidden="true" /></Button></div>}
 </section>}

 <DataTable pager={pager} items={pager.items} onEdit={onEdit} onDelete={onDelete ? async account => { await onDelete(account); await pager.refresh(); if(view === "reporting") await groups.refresh(); } : undefined} emptyLabel={t("workspace.emptyTitle")} editLabel={t("workspace.edit")} columns={[
 {key:"name",label:t("modal.name"),render:item=>item.name},
 {key:"code",label:t("modal.code"),render:item=>item.code},
 {key:"type",label:t("modal.accountType"),render:item=>t(`modal.${item.account_type}`)},
 {key:"manual",label:t(view==="reporting"?"modal.statementSection":"workspace.manualPostingLabel"),render:item=>view==="reporting"?accounting(`common.sections.${item.statement_section==="off_balance"?"offBalance":item.statement_section}`):t(item.allows_manual_posting?"workspace.manualAllowed":"workspace.manualBlocked")},
 {key:"group",label:t(view==="reporting"?"modal.reportGroup":"workspace.bankControlLabel"),render:item=>view==="reporting"?[item.report_group,item.report_subgroup].filter(Boolean).join(" / ")||"—":t(item.is_bank_control?"workspace.bankControlYes":"workspace.bankControlNo")},
 {key:"status",label:accounting("table.status"),render:item=><AccountingStatus active={item.is_active} label={t(item.is_active?"modal.active":"workspace.inactive")} />}
 ]} />
 </div>;
}

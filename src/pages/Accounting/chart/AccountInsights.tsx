import { useAccountingList } from "../components/useAccountingList";
import type { AccountFilters } from "./accountFilters";
import { useTranslation } from "react-i18next";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import AccountingRecords from "../components/AccountingRecords";
import AccountingStatus from "../components/AccountingStatus";
export type AccountInsight = "posting-controls" | "bank-control" | "reporting";
export default function AccountInsights({ filters, view, onEdit, onDelete }: { filters: AccountFilters; view: AccountInsight; onEdit?: (account: LedgerAccount) => void; onDelete?: (account: LedgerAccount) => Promise<unknown> }) {
 const { t } = useTranslation("ledgerAccounts"); const { t: accounting } = useTranslation("accountingSettings");
 const query = { ...filters, view };
 const pager = useAccountingList<LedgerAccount>("accounts", query);
 const groups = useAccountingList<{ id: string; name: string; count: number }>(view === "reporting" ? "reporting-groups" : undefined, query);
 return <div className="space-y-4">
 {pager.error && <p role="alert" className="text-sm text-red-700">{pager.error}</p>}
 {view==="reporting"&&<AccountingRecords pager={groups} items={groups.items} emptyLabel={t("workspace.emptyTitle")} editLabel={t("workspace.edit")} columns={[{key:"name",label:t("modal.reportGroup"),render:item=>item.name||t("workspace.unassigned")},{key:"count",label:t("workspace.summaryTotal"),render:item=>item.count}]} />}
 <AccountingRecords pager={pager} items={pager.items} onEdit={onEdit} onDelete={onDelete ? async account => { await onDelete(account); await pager.refresh(); if(view === "reporting") await groups.refresh(); } : undefined} emptyLabel={t("workspace.emptyTitle")} editLabel={t("workspace.edit")} columns={[
 {key:"name",label:t("modal.name"),render:item=>item.name},
 {key:"code",label:t("modal.code"),render:item=>item.code},
 {key:"type",label:t("modal.accountType"),render:item=>t(`modal.${item.account_type}`)},
 {key:"manual",label:t(view==="reporting"?"modal.statementSection":"workspace.manualPostingLabel"),render:item=>view==="reporting"?accounting(`common.sections.${item.statement_section==="off_balance"?"offBalance":item.statement_section}`):t(item.allows_manual_posting?"workspace.manualAllowed":"workspace.manualBlocked")},
 {key:"group",label:t(view==="reporting"?"modal.reportGroup":"workspace.bankControlLabel"),render:item=>view==="reporting"?[item.report_group,item.report_subgroup].filter(Boolean).join(" / ")||"—":t(item.is_bank_control?"workspace.bankControlYes":"workspace.bankControlNo")},
 {key:"status",label:accounting("table.status"),render:item=><AccountingStatus active={item.is_active} label={t(item.is_active?"modal.active":"workspace.inactive")} />}
 ]} />
 </div>;
}

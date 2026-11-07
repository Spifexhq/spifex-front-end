import { useTranslation } from "react-i18next";
import { ChevronRight, Landmark } from "lucide-react";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import DataTable from "@/shared/ui/DataTable";
import AccountingTerm from "../components/AccountingTerm";
import AccountingStatus from "../components/AccountingStatus";
import type { AccountRow, AccountView } from "./accountHierarchy";
type Props={rows:AccountRow[];childIds:Set<string>;closed:Set<string>;viewMode:AccountView;toggle(id:string):void;onInspect(account:LedgerAccount):void;onEdit?:(account:LedgerAccount)=>void};
/** Hierarchy adapter: the shared DataTable owns rendering, resizing and row actions. */
export default function AccountTable({rows,childIds,closed,viewMode,toggle,onInspect,onEdit}:Props){
 const {t}=useTranslation("ledgerAccounts");
 return <DataTable items={rows.map(row=>({...row,id:row.account.id}))} pagination={false} inspectable={false} initialWidths={[35,13,19,18,15]} className="rounded-none! border-0!" rowClassName={row=>row.account.account_type==="header"?"bg-gray-50/60":""} emptyLabel={t("workspace.emptyTitle")} editLabel={t("workspace.edit")} onEdit={onEdit?row=>onEdit(row.account):undefined} columns={[
 {key:"name",label:t("modal.name"),render:({account,depth})=>(          <div className="flex min-h-10 items-center gap-1" style={{ paddingLeft: viewMode === "tree" ? Math.min(depth, 12) * 14 : 0 }}>
            {viewMode === "tree" && (childIds.has(account.id) ? <button type="button" aria-expanded={!closed.has(account.id)} aria-label={t(closed.has(account.id) ? "explorer.expandGroup" : "explorer.collapseGroup", { name: account.name })} className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-900" onClick={() => toggle(account.id)}><ChevronRight size={13} className={closed.has(account.id) ? "" : "rotate-90"} /></button> : <span className="w-5 shrink-0" />)}
            <button type="button" className={`min-w-0 truncate py-2 text-left hover:underline focus-visible:outline-2 focus-visible:outline-gray-400 ${account.account_type === "header" ? "font-semibold" : "font-medium"}`} onClick={() => onInspect(account)} title={account.name}>{account.name}</button>{account.is_bank_control && <Landmark size={13} className="ml-1 shrink-0 text-gray-400" aria-label={t("modal.bankControl")} />}
          </div>)},
 {key:"code",mobile:true,label:t("modal.code"),render:row=><span className="font-mono text-[11px]">{row.account.code}</span>},
 {key:"type",label:t("modal.accountType"),header:<AccountingTerm term="posting">{t("modal.accountType")}</AccountingTerm>,render:row=>t(`modal.${row.account.account_type}`)},
 {key:"balance",label:t("modal.normalBalance"),header:<AccountingTerm term="normalBalance">{t("modal.normalBalance")}</AccountingTerm>,render:row=>t(`modal.${row.account.normal_balance}`)},
 {key:"status",label:t("explorer.status","Status"),render:row=><AccountingStatus active={row.account.is_active} label={t(row.account.is_active?"modal.active":"workspace.inactive")}/>}
 ]}/>;
}

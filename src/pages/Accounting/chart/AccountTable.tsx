import { useTranslation } from "react-i18next";
import { ChevronRight, Pencil, Landmark } from "lucide-react";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import AccountingTerm from "../components/AccountingTerm";
import type { AccountRow, AccountView } from "./accountHierarchy";
type Props = { rows: AccountRow[]; childIds: Set<string>; closed: Set<string>; viewMode: AccountView; toggle(id: string): void; onInspect(account: LedgerAccount): void; onEdit?: (account: LedgerAccount) => void };
export default function AccountTable({ rows, childIds, closed, viewMode, toggle, onInspect, onEdit }: Props) {
  const { t } = useTranslation("ledgerAccounts");
  return (
    <div className="max-h-[65dvh] min-h-[240px] overflow-auto">
      <table className="w-full min-w-0 table-fixed md:min-w-[740px] text-left text-[13px]">
        <colgroup><col /><col className="w-[72px] md:w-[105px]" /><col className="hidden w-[120px] md:table-column" /><col className="hidden w-[110px] md:table-column" /><col className="hidden w-[125px] md:table-column" /><col className="w-[40px] md:w-[55px]" /></colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50"><tr className="border-b border-gray-200 text-xs text-gray-500"><th className="px-3 py-2.5 font-medium">{t("modal.name")}</th><th className="px-4 py-2.5 font-medium">{t("modal.code")}</th><th className="hidden px-3 py-2.5 font-medium md:table-cell"><AccountingTerm term="posting">{t("modal.accountType")}</AccountingTerm></th><th className="hidden px-3 py-2.5 font-medium md:table-cell"><AccountingTerm term="normalBalance">{t("modal.normalBalance")}</AccountingTerm></th><th className="hidden px-3 py-2.5 font-medium md:table-cell">{t("explorer.status", "Status")}</th><th className="px-2 py-2.5"><span className="sr-only">{t("workspace.edit")}</span></th></tr></thead>
        <tbody>{rows.map(({ account, depth }) => <tr key={account.id} className={`group border-b border-gray-100 last:border-0 ${account.account_type === "header" ? "bg-gray-50/60" : ""}`}>

          <td className="px-3"><div className="flex min-h-10 items-center gap-1" style={{ paddingLeft: viewMode === "tree" ? Math.min(depth, 12) * 14 : 0 }}>
            {viewMode === "tree" && (childIds.has(account.id) ? <button type="button" aria-expanded={!closed.has(account.id)} aria-label={t(closed.has(account.id) ? "explorer.expandGroup" : "explorer.collapseGroup", { name: account.name })} className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-900" onClick={() => toggle(account.id)}><ChevronRight size={13} className={closed.has(account.id) ? "" : "rotate-90"} /></button> : <span className="w-5 shrink-0" />)}
            <button type="button" className={`min-w-0 truncate py-2 text-left hover:underline focus-visible:outline-2 focus-visible:outline-gray-400 ${account.account_type === "header" ? "font-semibold" : "font-medium"}`} onClick={() => onInspect(account)} title={account.name}>{account.name}</button>{account.is_bank_control && <Landmark size={13} className="ml-1 shrink-0 text-gray-400" aria-label={t("modal.bankControl")} />}
          </div></td>
          <td className="px-4 font-mono text-[11px] text-gray-500"><span title={account.code} className="block truncate">{account.code}</span></td>
          <td className="hidden px-3 text-xs text-gray-500 md:table-cell">{t(`modal.${account.account_type}`)}</td>
          <td className="hidden px-3 text-xs text-gray-500 md:table-cell">{t(`modal.${account.normal_balance}`)}</td>
          <td className="hidden px-3 md:table-cell"><span className={`inline-flex items-center gap-1.5 text-xs ${account.is_active ? "text-gray-600" : "text-gray-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${account.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />{t(account.is_active ? "modal.active" : "workspace.inactive")}</span></td>
          <td className="px-2">{!!onEdit && <button type="button" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-gray-400" onClick={() => onEdit(account)} title={t("workspace.edit")} aria-label={t("explorer.editAccount", "Edit {{name}}", { name: account.name })}><Pencil size={13} /></button>}</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <div className="px-5 py-12 text-center"><p className="text-sm font-medium text-gray-900">{t("workspace.emptyTitle")}</p><p className="mt-2 text-xs text-gray-500">{t("workspace.emptySubtitle")}</p></div>}
    </div>
  );
}

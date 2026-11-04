import { useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Pencil, Landmark } from "lucide-react";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import AccountingTerm from "../components/AccountingTerm";
import type { AccountRow, AccountView } from "./accountHierarchy";
type Props = { rows: AccountRow[]; childIds: Set<string>; closed: Set<string>; viewMode: AccountView; toggle(id: string): void; onInspect(account: LedgerAccount): void; onEdit?: (account: LedgerAccount) => void };
export default function AccountTable({ rows, childIds, closed, viewMode, toggle, onInspect, onEdit }: Props) {
  const { t } = useTranslation("ledgerAccounts");
  const table = useRef<HTMLTableElement>(null);
  const [widths, setWidths] = useState([35, 13, 19, 18, 15]);
  const drag = useRef<{ x: number; widths: number[]; total: number } | null>(null);
  const adjust = (initial: number[], index: number, delta: number) => {
    const shift = Math.max(8 - initial[index], Math.min(initial[index + 1] - 8, delta));
    const next = [...initial]; next[index] += shift; next[index + 1] -= shift;
    setWidths(next);
  };
  const labels = [t("modal.name"), t("modal.code"), t("modal.accountType"), t("modal.normalBalance"), t("explorer.status", "Status")];
  return (
    <div className="max-h-[65dvh] overflow-auto">
      <table ref={table} className="w-full min-w-0 table-fixed md:min-w-[740px] text-left text-[13px]">
        <colgroup>{widths.map((width, i) => <col key={i} style={{ "--column-width": `${width * 0.945}%` } as CSSProperties} className={`${i > 1 ? "hidden md:table-column" : i === 1 ? "w-[72px]" : ""} md:[width:var(--column-width)]`} />)}<col className="w-[40px] md:w-[5.5%]" /></colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50"><tr className="border-b border-gray-200 text-xs text-gray-500">{labels.map((label, i) => <th key={i} className={`relative px-3 py-2.5 font-medium ${i > 1 ? "hidden md:table-cell" : ""}`}>
          {i === 2 ? <AccountingTerm term="posting">{label}</AccountingTerm> : i === 3 ? <AccountingTerm term="normalBalance">{label}</AccountingTerm> : label}
          {i < widths.length - 1 && <button type="button" role="separator" aria-orientation="vertical" aria-label={label} aria-valuenow={Math.round(widths[i])} aria-valuemin={8} aria-valuemax={Math.round(widths[i] + widths[i + 1] - 8)} className="absolute inset-y-2 right-0 hidden w-2 cursor-col-resize touch-none border-r border-gray-200/70 hover:border-gray-400 focus-visible:border-gray-500 focus-visible:outline-none md:block"
            onPointerDown={event => { event.preventDefault(); drag.current = { x: event.clientX, widths: [...widths], total: Math.max(1, (table.current?.getBoundingClientRect().width || 740) * 0.945) }; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={event => { if (drag.current) adjust(drag.current.widths, i, (event.clientX - drag.current.x) / drag.current.total * 100); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
            onKeyDown={event => { if (["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); adjust(widths, i, event.key === "ArrowRight" ? 1 : -1); } }} />}
        </th>)}<th className="px-2 py-2.5"><span className="sr-only">{t("workspace.edit")}</span></th></tr></thead>
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

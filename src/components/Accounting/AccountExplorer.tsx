import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, Pencil, Landmark, ListTree, List } from "lucide-react";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import AccountingSideModal from "@/pages/AccountingSettings/components/AccountingSideModal";
import AccountingTerm from "@/pages/AccountingSettings/components/AccountingTerm";
import Button from "@/shared/ui/Button";

type Props = {
  items: LedgerAccount[];
  languageCode?: string | null;
  onEdit?: (account: LedgerAccount) => void;
  onDelete?: (account: LedgerAccount) => void;
  editable?: boolean;
  viewMode: "tree" | "list";
  onViewModeChange: (mode: "tree" | "list") => void;
};
const sections = ["asset", "liability", "equity", "income", "expense", "off_balance", "statistical"] as const;
const sort = (a: LedgerAccount, b: LedgerAccount) => a.code.localeCompare(b.code, undefined, { numeric: true }) || a.name.localeCompare(b.name);

export default function AccountExplorer({ items, onEdit, onDelete, editable = true, viewMode, onViewModeChange }: Props) {
  const { t } = useTranslation("ledgerAccounts");
  const { t: accounting } = useTranslation("accountingSettings");
  const [section, setSection] = useState("");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find(item => item.id === selectedId);
  const sectionLabel = (value: string) => accounting(`common.sections.${value === "off_balance" ? "offBalance" : value}`);
  const filtered = useMemo(() => items.filter(item => !section || item.statement_section === section).sort(sort), [items, section]);
  const { rows, childIds } = useMemo(() => {
    const byId = new Map(filtered.map(item => [item.id, item]));
    const children = new Map<string, LedgerAccount[]>();
    const roots: LedgerAccount[] = [];
    filtered.forEach(item => {
      if (item.parent_id && byId.has(item.parent_id) && item.parent_id !== item.id) children.set(item.parent_id, [...(children.get(item.parent_id) ?? []), item]);
      else roots.push(item);
    });
    const rows: { account: LedgerAccount; depth: number }[] = [];
    const seen = new Set<string>();
    const append = (account: LedgerAccount, depth: number) => {
      if (seen.has(account.id)) return;
      seen.add(account.id);
      rows.push({ account, depth });
      if (!closed.has(account.id)) children.get(account.id)?.forEach(child => append(child, depth + 1));
    };
    if (viewMode === "list") filtered.forEach(account => rows.push({ account, depth: 0 }));
    else roots.forEach(account => append(account, 0));
    return { rows, childIds: new Set(children.keys()) };
  }, [filtered, closed, viewMode]);
  const toggle = (id: string) => setClosed(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <section className="account-explorer min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-gray-500"><span className="font-semibold text-gray-900">{t("explorer.accounts", "Accounts")}</span><span className="rounded bg-gray-100 px-1.5 py-0.5 tabular-nums">{filtered.length}</span><span className="hidden sm:inline">{t("explorer.postingCount", "{{count}} posting accounts", { count: filtered.filter(item => item.account_type === "posting").length })}</span></div>
      <div className="flex items-center gap-1">
        {viewMode === "tree" && <><button type="button" onClick={() => setClosed(new Set())} className="explorer-tool" title={t("explorer.expandAll", "Expand all")} aria-label={t("explorer.expandAll", "Expand all")}><ChevronsUpDown size={15} /></button><button type="button" onClick={() => setClosed(new Set(items.filter(item => item.account_type === "header").map(item => item.id)))} className="explorer-tool" title={t("explorer.collapseAll", "Collapse all")} aria-label={t("explorer.collapseAll", "Collapse all")}><ChevronsDownUp size={15} /></button><span className="mx-2 h-4 border-l border-gray-200" /></>}
        {(["tree", "list"] as const).map(mode => <button key={mode} type="button" onClick={() => onViewModeChange(mode)} aria-pressed={viewMode === mode} className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs ${viewMode === mode ? "bg-gray-100 font-medium text-gray-900" : "text-gray-500 hover:bg-gray-50"}`}>{mode === "tree" ? <ListTree size={14} /> : <List size={14} />}{t(mode === "tree" ? "workspace.viewTree" : "workspace.viewList")}</button>)}
      </div>
    </div>
    <div className="account-facets flex gap-1 overflow-x-auto border-b border-gray-200 px-3 py-2" aria-label={t("modal.statementSection")}>
      {["", ...sections].map(value => <button key={value} type="button" aria-pressed={section === value} onClick={() => setSection(value)} className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs ${section === value ? "bg-gray-900 font-medium text-white" : "text-gray-500 hover:bg-gray-100"}`}>{value ? sectionLabel(value) : t("explorer.allAccounts", "All accounts")}</button>)}
    </div>
    <div className="max-h-[65dvh] min-h-[240px] overflow-auto">
      <table className="w-full min-w-0 table-fixed md:min-w-[740px] text-left text-[13px]">
        <colgroup><col className="w-[72px] md:w-[105px]" /><col /><col className="hidden w-[120px] md:table-column" /><col className="hidden w-[110px] md:table-column" /><col className="hidden w-[125px] md:table-column" /><col className="w-[40px] md:w-[55px]" /></colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50"><tr className="border-b border-gray-200 text-xs text-gray-500"><th className="px-4 py-2.5 font-medium">{t("modal.code")}</th><th className="px-3 py-2.5 font-medium">{t("modal.name")}</th><th className="hidden px-3 py-2.5 font-medium md:table-cell"><AccountingTerm term="posting">{t("modal.accountType")}</AccountingTerm></th><th className="hidden px-3 py-2.5 font-medium md:table-cell"><AccountingTerm term="normalBalance">{t("modal.normalBalance")}</AccountingTerm></th><th className="hidden px-3 py-2.5 font-medium md:table-cell">{t("explorer.status", "Status")}</th><th className="px-2 py-2.5"><span className="sr-only">{t("workspace.edit")}</span></th></tr></thead>
        <tbody>{rows.map(({ account, depth }) => <tr key={account.id} className={`group border-b border-gray-100 last:border-0 ${account.account_type === "header" ? "bg-gray-50/60" : ""}`}>
          <td className="px-4 font-mono text-[11px] text-gray-500"><span title={account.code} className="block truncate">{account.code}</span></td>
          <td className="px-3"><div className="flex min-h-10 items-center gap-1" style={{ paddingLeft: viewMode === "tree" ? Math.min(depth, 12) * 14 : 0 }}>
            {viewMode === "tree" && (childIds.has(account.id) ? <button type="button" aria-expanded={!closed.has(account.id)} aria-label={t(closed.has(account.id) ? "explorer.expandGroup" : "explorer.collapseGroup", { name: account.name })} className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-900" onClick={() => toggle(account.id)}><ChevronRight size={13} className={closed.has(account.id) ? "" : "rotate-90"} /></button> : <span className="w-5 shrink-0" />)}
            <button type="button" className={`min-w-0 truncate py-2 text-left hover:underline focus-visible:outline-2 focus-visible:outline-gray-400 ${account.account_type === "header" ? "font-semibold" : "font-medium"}`} onClick={() => setSelectedId(account.id)} title={account.name}>{account.name}</button>{account.is_bank_control && <Landmark size={13} className="ml-1 shrink-0 text-gray-400" aria-label={t("modal.bankControl")} />}
          </div></td>
          <td className="hidden px-3 text-xs text-gray-500 md:table-cell">{t(`modal.${account.account_type}`)}</td>
          <td className="hidden px-3 text-xs text-gray-500 md:table-cell">{t(`modal.${account.normal_balance}`)}</td>
          <td className="hidden px-3 md:table-cell"><span className={`inline-flex items-center gap-1.5 text-xs ${account.is_active ? "text-gray-600" : "text-gray-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${account.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />{t(account.is_active ? "modal.active" : "workspace.inactive")}</span></td>
          <td className="px-2">{editable && onEdit && <button type="button" className="explorer-tool" onClick={() => onEdit(account)} title={t("workspace.edit")} aria-label={t("explorer.editAccount", "Edit {{name}}", { name: account.name })}><Pencil size={13} /></button>}</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <div className="px-5 py-12 text-center"><p className="text-sm font-medium text-gray-900">{t("workspace.emptyTitle")}</p><p className="mt-2 text-xs text-gray-500">{t("workspace.emptySubtitle")}</p></div>}
    </div>
    <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-2 text-[11px] text-gray-400">{t("explorer.visibleCount", "{{visible}} of {{total}} accounts shown", { visible: rows.length, total: filtered.length })}<span className="ml-3 hidden sm:inline">{t("explorer.inspectHint", "Select an account name to see its details.")}</span></div>
    <AccountingSideModal recordLabel={t("modal.name")} recordName={selected?.name} isOpen={!!selected} title={selected?.name || ""} subtitle={selected?.code} onClose={() => setSelectedId(null)}
      footer={selected && editable ? <>
        {onDelete && !selected.is_system ? <Button type="button" variant="cancel" className="w-full md:w-auto" onClick={() => { setSelectedId(null); onDelete(selected); }}>{t("workspace.delete")}</Button> : <span />}
        {onEdit && <Button type="button" variant="outline" className="w-full md:w-auto" onClick={() => { setSelectedId(null); onEdit(selected); }}>{t("workspace.edit")}</Button>}
      </> : undefined}>
      {selected && <div className="space-y-6"><dl className="divide-y divide-gray-100 text-[13px]">{[
        [t("modal.accountType"), t(`modal.${selected.account_type}`)], [t("modal.statementSection"), sectionLabel(selected.statement_section)], [t("modal.normalBalance"), t(`modal.${selected.normal_balance}`)], [t("modal.parent"), items.find(item => item.id === selected.parent_id)?.name || "—"], [t("modal.currencyCode"), selected.currency_code || "—"], [t("modal.bankControl"), accounting(selected.is_bank_control ? "common.yes" : "common.no")], [t("modal.manualPosting"), accounting(selected.allows_manual_posting ? "common.yes" : "common.no")], [t("modal.reportGroup"), selected.report_group || "—"], [t("modal.reportSubgroup"), selected.report_subgroup || "—"], [t("modal.externalRef"), selected.external_ref || "—"],
      ].map(([label, value]) => <div key={label} className="flex justify-between gap-6 py-3"><dt className="text-gray-500">{label}</dt><dd className="max-w-[60%] break-words text-right font-medium text-gray-900">{value}</dd></div>)}</dl>{selected.description && <p className="text-[13px] leading-6 text-gray-500">{selected.description}</p>}
      </div>}
    </AccountingSideModal>
  </section>;
}

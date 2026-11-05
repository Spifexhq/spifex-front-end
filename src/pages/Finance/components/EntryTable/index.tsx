import { useFinanceLoading } from "../financeLoading";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { api } from "@/api/requests";
import DataTable from "@/shared/ui/DataTable";
import Button from "@/shared/ui/Button";
import { formatCurrency, formatDateFromISO } from "@/lib";
import type { EntryFilters } from "@/models/components/filterBar";
import type { Entry } from "@/models/entries/entries";
import { useEntries } from "./useEntries";
import { buildEntryRows, entryId, isSettlement, type EntryRow, type FinancialEntry } from "./entryRows";
import EntryPreview from "./EntryPreview";
import SelectionToolbar from "./SelectionToolbar";
import { accountingColors } from "./accountingColors";
import AccountingIndicator, { AccountingLegend } from "./AccountingIndicator";
export type EntryTableHandle = {
    clearSelection(): void;
    refresh(): void;
};
export type EntryTableProps = {
    settled: boolean;
    filters?: EntryFilters;
    onEdit?(entry: Entry): void;
    onSettle?(entries: Entry[]): void;
    onChanged?(): void;
};
const EntryTable = forwardRef<EntryTableHandle, EntryTableProps>(({ settled, filters, onEdit, onSettle, onChanged }, ref) => {
    const { t, i18n } = useTranslation("financeEntries");
    const auth = useAuthContext();
    const allowed = (permission: string) => auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
    const pager = useEntries(filters, settled);
    useFinanceLoading("entries", (!pager.knownPages && !pager.error) || (pager.loading && !pager.items.length));
    const rows = useMemo(() => buildEntryRows(pager.items, !pager.reachedEnd), [pager.items, pager.reachedEnd]);
    const loadedCount = rows.filter(row => row.kind === "record").length;
    const { refresh } = pager;
    const [preview, setPreview] = useState<FinancialEntry | null>(null), [clearToken, setClearToken] = useState(0), [mutating, setMutating] = useState(false);
    useImperativeHandle(ref, () => ({ clearSelection: () => setClearToken(value => value + 1), refresh: () => { void refresh(); } }), [refresh]);
    const inspect = (row: EntryRow) => { if (row.entry)
        setPreview(row.entry); };
    const edit = (row: EntryRow) => { if (row.entry && !isSettlement(row.entry))
        onEdit?.(row.entry); };
    const month = (date: string) => new Intl.DateTimeFormat(i18n.language, { month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
    const canEdit = !settled && allowed("change_cash_flow_entries") && !!onEdit;
    const canSelect = settled ? allowed("delete_settled_entries") : allowed("delete_cash_flow_entries") || allowed("add_settled_entries");
    return <>
  <DataTable items={rows} columns={[
            { key: "name", label: t("entries"), header: <span className="inline-flex max-w-full min-w-0 items-center gap-1"><span className="truncate">{t("entries")}</span><span className="hidden shrink-0 text-gray-400 md:inline">({loadedCount})</span>{!settled && <span className="inline-flex md:hidden"><AccountingLegend showLabel={false}/></span>}</span>, render: row => row.entry ? <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5">{!settled && <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full md:hidden ${!isSettlement(row.entry) ? accountingColors[row.entry.accounting?.status || "uncategorised"] : "bg-gray-300"}`}/>}<span className="truncate text-[13px] font-medium leading-4">{row.entry.description || t("untitled")}</span>{(row.entry.installment_count ?? 0) > 1 && <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium leading-none text-slate-500 tabular-nums" aria-label={t("installmentNumber", { index: row.entry.installment_index ?? "?", count: row.entry.installment_count ?? 1 })}>{row.entry.installment_index ?? "?"}/{row.entry.installment_count}</span>}</div><p className="mt-0.5 truncate text-[10px] font-normal leading-3 text-gray-500">{formatDateFromISO(row.date)}{isSettlement(row.entry) && row.entry.bank?.institution ? ` · ${row.entry.bank.institution}` : ""}</p></div> : <span className="text-xs font-semibold text-gray-700">{row.partial ? t("monthPartial", { month: month(row.date) }) : month(row.date)}</span> },
            ...(settled ? [{ key: "bank", label: t("bank"), render: (row: EntryRow) => row.entry && isSettlement(row.entry) ? row.entry.bank?.institution || "—" : "" }] : [{ key: "accounting", label: t("accounting"), header: <AccountingLegend />, render: (row: EntryRow) => row.entry && !isSettlement(row.entry) ? <AccountingIndicator accounting={row.entry.accounting} onOpen={() => inspect(row)}/> : null }]),
            { key: "amount", mobile: true, mobileWidth: "110px", label: t("amount"), render: row => <span className={`font-medium tabular-nums ${row.amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatCurrency(row.amount)}</span> },
            { key: "balance", label: t("balance"), render: row => <span className="tabular-nums">{row.balance == null ? "—" : formatCurrency(row.balance)}</span> },
        ]} initialWidths={[48, 16, 18, 18]} emptyLabel={t("empty")} editLabel={t("edit")} fillHeight virtualize rowHeight={row => row.kind === "summary" ? 30 : 40} pagination={false} selectable selectionPadding={180} canSelect={canSelect} rowKind={row => row.kind} getRowName={row => row.entry?.description || month(row.date)} rowClassName={row => row.kind === "summary" ? "bg-gray-50/70" : ""} className="rounded-none! border-0!" busy={mutating || (pager.loading && !pager.items.length)} error={pager.error} onDelete={async row => { if (!row.entry) return; const id = entryId(row.entry); if (settled) await api.deleteSettledEntry(id); else await api.deleteEntry(id); }} canDelete={allowed(settled ? "delete_settled_entries" : "delete_cash_flow_entries")} onDeleted={async () => { await pager.refresh(); onChanged?.(); }} onInspect={inspect} onEdit={canEdit ? edit : undefined} clearSelectionToken={clearToken} onEndReached={() => { if (pager.canNext && !pager.loading && !pager.error)
        void pager.next(); }} loadingMore={pager.loading} summary={pager.loading ? <p role="status" className="shrink-0 border-t border-gray-100 px-3 py-2 text-center text-xs text-gray-500">{t(pager.items.length ? "loadingMore" : "loading")}</p> : pager.error ? <div className="flex justify-center py-2"><Button size="sm" variant="outline" onClick={() => void pager.refresh()}>{t("retry")}</Button></div> : undefined} selectionActions={selection => <SelectionToolbar entries={selection.items.flatMap(row => row.entry ? [row.entry] : [])} settled={settled} onClear={selection.clear} onRefresh={pager.refresh} onChanged={onChanged} onSettle={onSettle} onBusyChange={setMutating}/>}/>
  <EntryPreview entry={preview} onClose={() => setPreview(null)} onEdit={canEdit ? onEdit : undefined}/>
 </>;
});
EntryTable.displayName = "EntryTable";
export default EntryTable;

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { api } from "@/core/api/requests";
import { formatDateFromISO } from "@/lib";
import type { EntryFilters } from "@/models/components/filterBar";
import type { Entry } from "@/models/entries/entries";
import FinancialActivityTable, { type FinancialActivityRecord } from "@/shared/financial/components/FinancialActivityTable";
import { useEntries } from "./useEntries";
import { entryDate, entryId, isSettlement, signedAmount, type FinancialEntry } from "./entryRows";
import EntryPreview from "./EntryPreview";
import SelectionToolbar from "./SelectionToolbar";
import { accountingColors } from "./accountingColors";
import AccountingIndicator, { AccountingLegend } from "./AccountingIndicator";

export type EntryTableHandle = { clearSelection(): void; refresh(): void };
export type EntryTableProps = { settled: boolean; filters?: EntryFilters; onEdit?(entry: Entry): void; onSettle?(entries: Entry[]): void; onChanged?(): void };

const EntryTable = forwardRef<EntryTableHandle, EntryTableProps>(({ settled, filters, onEdit, onSettle, onChanged }, ref) => {
  const { t, i18n } = useTranslation("financeEntries");
  const auth = useAuthContext();
  const allowed = (permission: string) => auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
  const pager = useEntries(filters, settled);
  const [preview, setPreview] = useState<FinancialEntry | null>(null);
  const [clearToken, setClearToken] = useState(0);
  const [mutating, setMutating] = useState(false);
  const { refresh } = pager;
  useImperativeHandle(ref, () => ({ clearSelection: () => setClearToken(value => value + 1), refresh: () => { void refresh(); } }), [refresh]);

  const records = useMemo<FinancialActivityRecord<FinancialEntry>[]>(() => pager.items.map(entry => {
    const signed = signedAmount(entry);
    const rawBalance = entry.running_balance;
    return {
      id: entryId(entry), description: entry.description || "", date: entryDate(entry), amount: signed,
      balance: rawBalance != null && rawBalance !== "" && Number.isFinite(Number(rawBalance)) ? Number(rawBalance) : null,
      direction: signed >= 0 ? "credit" : "debit",
      installmentIndex: entry.installment_index, installmentCount: entry.installment_count,
      bankName: isSettlement(entry) ? entry.bank?.institution : null,
      activityKind: isSettlement(entry) ? "settlement" : "entry", source: entry,
    };
  }), [pager.items]);
  const canEdit = !settled && allowed("change_cash_flow_entries") && !!onEdit;
  const canSelect = settled ? allowed("delete_settled_entries") : allowed("delete_cash_flow_entries") || allowed("add_settled_entries");
  const pagerAdapter = { ...pager, error: pager.error };
  return <>
    <FinancialActivityTable
      records={records}
      currency={auth.organization?.organization?.currency || "EUR"}
      locale={i18n.language}
      emptyLabel={t("empty")}
      secondColumnLabel={settled ? t("bank") : t("accounting")}
      secondColumnHeader={!settled ? <AccountingLegend/> : undefined}
      headerAccessory={!settled ? <span className="inline-flex md:hidden"><AccountingLegend showLabel={false}/></span> : undefined}
      renderName={record => <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5">{!settled && <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full md:hidden ${isSettlement(record.source) ? "bg-gray-300" : accountingColors[record.source.accounting?.status || "uncategorised"]}`}/>}<span className="truncate text-[13px] font-medium leading-4">{record.description || t("untitled")}</span>{(record.installmentCount ?? 0) > 1 && <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium leading-none text-slate-500 tabular-nums" aria-label={t("installmentNumber", { index: record.installmentIndex ?? "?", count: record.installmentCount ?? 1 })}>{record.installmentIndex ?? "?"}/{record.installmentCount}</span>}</div><p className="mt-0.5 truncate text-[10px] font-normal leading-3 text-gray-500">{formatDateFromISO(record.date)}{record.activityKind === "settlement" && record.bankName ? ` · ${record.bankName}` : ""}</p></div>}
      renderSecondColumn={record => {
        if (settled) return record.activityKind === "settlement" ? record.bankName || "—" : null;
        return !isSettlement(record.source) ? <AccountingIndicator accounting={record.source.accounting} onOpen={() => setPreview(record.source)}/> : null;
      }}
      pager={pagerAdapter}
      busy={pager.loading && !pager.items.length}
      mutating={mutating}
      error={pager.error}
      canSelect={canSelect}
      canDelete={allowed(settled ? "delete_settled_entries" : "delete_cash_flow_entries")}
      canEdit={canEdit}
      editLabel={t("edit")}
      onInspect={entry => setPreview(entry)}
      onEdit={entry => { if (!isSettlement(entry)) onEdit?.(entry); }}
      onDelete={entry => settled ? api.deleteSettledEntry(entryId(entry)) : api.deleteEntry(entryId(entry))}
      onDeleted={() => onChanged?.()}
      onSelection={selection => <SelectionToolbar
        entries={selection.items.flatMap(row => row.record ? [row.record.source] : [])}
        settled={settled}
        onClear={selection.clear}
        onRefresh={pager.refresh}
      onChanged={onChanged}
        onSettle={onSettle}
        onBusyChange={setMutating}
      />}
      clearSelectionToken={clearToken}
      onEndReached={() => { if (pager.canNext && !pager.loading && !pager.error) void pager.next(); }}
      loadMore={pager.loading}
      onRetry={() => void pager.refresh()}
    />
    <EntryPreview entry={preview} onClose={() => setPreview(null)} onEdit={canEdit ? onEdit : undefined} onSettle={!settled && allowed("add_settled_entries") && onSettle ? entry => onSettle([entry]) : undefined}/>
  </>;
});

EntryTable.displayName = "EntryTable";
export default EntryTable;

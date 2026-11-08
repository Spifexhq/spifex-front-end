import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDateFromISO } from "@/lib";
import DataTable, { type Column, type DataTableProps } from "@/shared/ui/DataTable";
import Button from "@/shared/ui/Button";
import { useFinanceLoading } from "@/shared/financial/FinanceLoadingContext";
import { buildFinancialActivityRows } from "./financialActivityRows";

export type FinancialActivityRecord<T> = {
  id: string;
  description: string;
  date: string;
  amount: number;
  balance: number | null;
  direction: "credit" | "debit" | "transfer";
  installmentIndex?: number | null;
  installmentCount?: number | null;
  bankName?: string | null;
  activityKind: "entry" | "settlement" | "transfer";
  source: T;
};

export type FinancialActivityRow<T> = {
  id: string;
  kind: "record" | "summary";
  record?: FinancialActivityRecord<T>;
  date: string;
  amount: number;
  balance: number | null;
  partial?: boolean;
};

type ActivityPager = NonNullable<DataTableProps<FinancialActivityRow<unknown>>["pager"]> & {
  knownPages?: number;
  error?: string | null;
  refresh?: () => Promise<void>;
};
type Selection<T> = { ids: string[]; items: FinancialActivityRow<T>[]; clear(): void };
type Props<T> = {
  records: FinancialActivityRecord<T>[];
  newestFirst?: boolean;
  currency: string;
  locale: string;
  emptyLabel: string;
  secondColumnLabel: string;
  secondColumnHeader?: ReactNode;
  renderSecondColumn(record: FinancialActivityRecord<T>): ReactNode;
  renderName?(record: FinancialActivityRecord<T>): ReactNode;
  headerAccessory?: ReactNode;
  pager: ActivityPager;
  busy?: boolean;
  error?: string | null;
  mutating?: boolean;
  canSelect: boolean;
  canDelete: boolean;
  canEdit?: boolean;
  rowCanEdit?(record: FinancialActivityRecord<T>): boolean;
  rowCanDelete?(record: FinancialActivityRecord<T>): boolean;
  editLabel: string;
  onInspect(record: T): void;
  onEdit?(record: T): void;
  onDelete?(record: T): Promise<unknown>;
  onDeleted?(): void | Promise<void>;
  onSelection?(selection: Selection<T>): ReactNode;
  onEndReached?(): void;
  loadMore?: boolean;
  onRetry?(): void;
  clearSelectionToken?: number;
};

export default function FinancialActivityTable<T>({ records, newestFirst = false, currency, locale, emptyLabel, secondColumnLabel, secondColumnHeader, renderSecondColumn, renderName, headerAccessory, pager, busy = false, error, mutating = false, canSelect, canDelete, canEdit = false, rowCanEdit, rowCanDelete, editLabel, onInspect, onEdit, onDelete, onDeleted, onSelection, onEndReached, loadMore = false, onRetry, clearSelectionToken }: Props<T>) {
  const { t } = useTranslation("financeEntries");
  const rows = useMemo(() => buildFinancialActivityRows(records, !!pager.canNext, newestFirst), [records, pager.canNext, newestFirst]);
  const loadedCount = rows.filter(row => row.kind === "record").length;
  useFinanceLoading("entries", (!pager.knownPages && !pager.error) || (pager.loading && !records.length));
  const columns = useMemo<Column<FinancialActivityRow<T>>[]>(() => [
    {
      key: "name",
      label: t("entries"),
      header: <span className="inline-flex max-w-full min-w-0 items-center gap-1"><span className="truncate">{t("entries")}</span><span className="hidden shrink-0 text-gray-400 md:inline">({loadedCount})</span>{headerAccessory}</span>,
      render: row => row.kind === "summary" ? <span className="text-xs font-semibold text-gray-700">{row.partial ? t("monthPartial", { month: new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(`${row.date}T12:00:00`)) }) : new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(`${row.date}T12:00:00`))}</span> : renderName?.(row.record!) || <div className="min-w-0"><div className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13px] font-medium leading-4">{row.record?.description || t("untitled")}</span>{(row.record?.installmentCount ?? 0) > 1 && <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium leading-none text-slate-500 tabular-nums">{row.record?.installmentIndex ?? "?"}/{row.record?.installmentCount}</span>}</div><p className="mt-0.5 truncate text-[10px] font-normal leading-3 text-gray-500">{formatDateFromISO(row.date)}{row.record?.activityKind === "settlement" && row.record.bankName ? ` · ${row.record.bankName}` : ""}</p></div>,
    },
    { key: "secondary", label: secondColumnLabel, header: secondColumnHeader, render: row => row.record ? renderSecondColumn(row.record) : null },
    { key: "amount", mobile: true, mobileWidth: "100px", label: t("amount"), render: row => <span className={`font-medium tabular-nums ${row.record?.direction === "transfer" || row.amount === 0 ? "text-gray-700" : row.amount > 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatCurrency(row.amount, currency)}</span> },
    { key: "balance", mobile: true, mobileWidth: "104px", label: t("balance"), render: row => <span className="tabular-nums">{row.balance == null ? "—" : formatCurrency(row.balance, currency)}</span> },
  ], [currency, headerAccessory, loadedCount, locale, renderName, renderSecondColumn, secondColumnHeader, secondColumnLabel, t]);
  return <DataTable
    mobileActions={false}
    items={rows}
    columns={columns}
    initialWidths={[48, 16, 18, 18]}
    pager={pager}
    emptyLabel={emptyLabel}
    editLabel={editLabel}
    fillHeight
    virtualize
    rowHeight={row => row.kind === "summary" ? 30 : 40}
    pagination={false}
    selectable
    selectionPadding={180}
    canSelect={canSelect}
    rowKind={row => row.kind}
    getRowName={row => row.record?.description || row.date}
    rowClassName={row => row.kind === "summary" ? "bg-gray-50/70" : ""}
    className="rounded-none! border-0!"
    busy={mutating || (busy && !rows.length)}
    error={error || pager.error}
    canDelete={canDelete}
    rowCanEdit={rowCanEdit ? row => row.record ? rowCanEdit(row.record) : false : undefined}
    rowCanDelete={rowCanDelete ? row => row.record ? rowCanDelete(row.record) : false : undefined}
    onDelete={onDelete ? row => row.record ? onDelete(row.record.source) : Promise.resolve() : undefined}
    onDeleted={async () => { await pager.refresh?.(); await onDeleted?.(); }}
    onInspect={row => { if (row.record) onInspect(row.record.source); }}
    onEdit={canEdit && onEdit ? row => { if (row.record) onEdit(row.record.source); } : undefined}
    clearSelectionToken={clearSelectionToken}
    onEndReached={onEndReached}
    loadingMore={loadMore || pager.loading}
    summary={pager.loading ? <p role="status" className="shrink-0 border-t border-gray-100 px-3 py-2 text-center text-xs text-gray-500">{t(records.length ? "loadingMore" : "loading")}</p> : pager.error ? <div className="flex justify-center py-2"><Button size="sm" variant="outline" onClick={onRetry}>{t("retry")}</Button></div> : undefined}
    selectionActions={selection => onSelection?.({ ids: selection.ids, items: selection.items, clear: selection.clear })}
  />;
}

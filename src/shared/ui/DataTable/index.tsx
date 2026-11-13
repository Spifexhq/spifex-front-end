import DataTableSkeleton from "./DataTableSkeleton";
export { default as DataTableSkeleton } from "./DataTableSkeleton";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil } from "lucide-react";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import Checkbox from "@/shared/ui/Checkbox";
import Button from "@/shared/ui/Button";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import CompactActionMenu from "@/shared/ui/Popover/CompactActionMenu";
import SelectionBar from "@/shared/ui/SelectionBar";
import { EmptyState, ErrorState } from "@/shared/ui/State";
import RecordPreview from "./RecordPreview";
import ResultsPerPage from "./ResultsPerPage";
import { useTablePagination } from "./useTablePagination";
import { useVirtualRows } from "./useVirtualRows";
import { useColumnWidths } from "./useColumnWidths";
import type { DataTableProps } from "./types";
export type { DataTableProps, Column, Pager } from "./types";
/** One table implementation for local collections and server cursor pages. */
export default function DataTable<T extends {
    id: string;
}>(props: DataTableProps<T>) {
    const { items, columns, pager, onEdit, onInspect, onDelete, onDeleted, actions, previewFields = [], emptyLabel, selectable = false, canEdit = true, canDelete = true, pagination = true, inspectable = true } = props;
    const { t } = useTranslation("common");
    const reducedMotion = useReducedMotion();
    const editLabel = props.editLabel || t("records.edit");
    const deleteLabel = props.deleteLabel || t("records.delete");
    const { onEndReached, loadingMore, endReachedThreshold = 150, virtualOverscan = 8 } = props;
    const page = useTablePagination(items, pager, pagination);
    const table = useRef<HTMLTableElement>(null), anchor = useRef<HTMLButtonElement | null>(null), bulkCancelRef = useRef<HTMLButtonElement>(null), autoLoadCount = useRef(-1);
    const sizing = useColumnWidths(columns.map(column => column.key), props.initialWidths);
    const [previewId, setPreviewId] = useState<string | null>(null), [menu, setMenu] = useState<T | null>(null), [deleting, setDeleting] = useState<T[]>([]), [bulkConfirming, setBulkConfirming] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
    const selectableRows = page.rows.filter(item => props.rowKind?.(item) !== "summary");
    const selection = useShiftSelect(selectableRows, item => item.id);
    const scroller = useRef<HTMLDivElement>(null);
    const { rowHeight } = props;
    const heightFor = (item: T) => typeof rowHeight === "function" ? rowHeight(item) : rowHeight || 48;
    const heights = useMemo(() => page.rows.map(item => typeof rowHeight === "function" ? rowHeight(item) : rowHeight || 48), [page.rows, rowHeight]);
    const virtual = useVirtualRows(scroller, heights, !!props.virtualize, `${page.rows[0]?.id || ""}:${page.pageSize}`, virtualOverscan);
    const desktopSpan = columns.length + (selectable ? 1 : 0) + 1;
    const mobileSpan = columns.filter((column, index) => index === 0 || column.mobile).length + (selectable ? 1 : 0) + (props.mobileActions === false ? 0 : 1);
    const spacer = (height: number) => <tr aria-hidden="true"><td className="hidden md:table-cell" colSpan={desktopSpan} style={{ height }}/><td className="md:hidden" colSpan={mobileSpan} style={{ height }}/></tr>;
    const selectionAllowed = props.canSelect ?? (canDelete && !!onDelete);
    const clearSelectionToken = props.clearSelectionToken;
    const clearRef = useRef(selection.clearSelection);
    clearRef.current = selection.clearSelection;
    useEffect(() => { if (clearSelectionToken !== undefined)
        clearRef.current(); }, [clearSelectionToken]);
    const { setSelectedIds } = selection;
    const dismissRowDeleteFlow = () => {
        setMenu(null);
        setDeleting([]);
        setBulkConfirming(false);
    };
    const selected = items.find(item => item.id === previewId);
    const signature = page.rows.map(item => item.id).join("|");
    useEffect(() => { if (pending)
        return; setSelectedIds(ids => ids.filter(id => signature.split("|").includes(id))); setMenu(null); }, [signature, setSelectedIds, pending]);
    useEffect(() => {
        if (props.busy || pending || !selection.selectedIds.length || menu || selected || deleting.length)
            return;
        const escape = (event: KeyboardEvent) => { if (event.key !== "Escape" || event.defaultPrevented || document.querySelector('[role="dialog"]'))
            return; selection.clearSelection(); event.preventDefault(); };
        window.addEventListener("keydown", escape);
        return () => window.removeEventListener("keydown", escape);
    }, [selection, menu, selected, deleting.length, props.busy, pending]);
    useEffect(() => { const node = scroller.current; if (!props.items.length) { autoLoadCount.current = -1; return; } if (node && !props.busy && !loadingMore && node.clientHeight > 0 && node.scrollHeight <= node.clientHeight + endReachedThreshold && autoLoadCount.current !== props.items.length) {
        autoLoadCount.current = props.items.length;
        onEndReached?.();
    } }, [props.items.length, onEndReached, loadingMore, props.busy, endReachedThreshold]);
    const busy = !!props.busy || !!pager?.loading || pending;
    const remove = async (targets: T[] = deleting) => {
        if (!onDelete || pending || !targets.length)
            return;
        setPending(true);
        setError("");
        try {
            const results = await Promise.allSettled(targets.map(item => onDelete(item)));
            const succeeded = targets.filter((_, i) => results[i].status === "fulfilled").map(item => item.id);
            const failed = targets.filter((_, i) => results[i].status === "rejected");
            selection.setSelectedIds(failed.map(item => item.id));
            if (succeeded.includes(previewId || ""))
                setPreviewId(null);
            setDeleting([]);
            setBulkConfirming(false);
            if (succeeded.length)
                await onDeleted?.(succeeded);
            if (failed.length) {
                const failure = results.find(result => result.status === "rejected") as PromiseRejectedResult;
                setError(apiErrorMessage(failure.reason, t("records.deleteError")));
            }
        }
        catch (cause) {
            setError(apiErrorMessage(cause, t("records.deleteError")));
        }
        finally {
            setBulkConfirming(false);
            setPending(false);
        }
    };
    const footerClass = "flex flex-wrap items-center justify-end gap-1 border-t border-gray-200 bg-gray-50/50 px-3 py-2 [&_button]:inline-flex [&_button]:min-h-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1.5 [&_button]:text-xs [&_button]:text-slate-600 [&_button:hover:not(:disabled)]:bg-gray-100 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40 max-md:[&_button]:min-h-10";
    if (busy && !items.length && !props.error && !error) return <DataTableSkeleton columns={columns.length} selectable={selectable} pagination={pagination} />;
    return <section aria-busy={busy || undefined} className={`${props.fillHeight ? "flex h-full min-h-0 flex-col" : ""} min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-none ${props.className || ""}`}>
  {(error || props.error) && <ErrorState variant="inline" message={props.errorContent || error || props.error} />}
  <div ref={scroller} style={selection.selectedIds.length && props.selectionPadding ? { paddingBottom: props.selectionPadding } : undefined} onScroll={() => { virtual.onScroll(); const node = scroller.current; if (node && node.scrollHeight - node.scrollTop - node.clientHeight < endReachedThreshold)
        props.onEndReached?.(); }} className={props.fillHeight ? "min-h-0 flex-1 overflow-auto" : "max-h-[65dvh] overflow-auto"}>
   <table ref={table} aria-label={t("records.list")} className="w-full table-fixed text-left text-[13px] md:min-w-[740px] [&_th]:font-medium! [&_th]:text-gray-500! [&_td]:py-0! max-md:min-w-0!">
    <colgroup>{selectable && <col className="w-10"/>}{columns.map((column, i) => <col key={column.key} style={{ "--column-width": `${sizing.widths[i]}%`, "--mobile-width": column.mobileWidth || "auto" } as CSSProperties} className={`md:[width:var(--column-width)] max-md:[width:var(--mobile-width)] ${i && !column.mobile ? "hidden md:table-column" : ""}`}/>)}<col className={`${props.mobileActions === false ? "hidden md:table-column" : ""} ${actions ? "w-[180px]" : onDelete && canDelete && onEdit && canEdit ? "w-[96px]" : "w-[55px]"}`}/></colgroup>
    <thead className="sticky top-0 z-10 bg-gray-50"><tr className="border-b border-gray-200 text-xs text-gray-500">
     {selectable && <th className="px-3"><Checkbox size="small" aria-label={t("records.selectAll")} checked={!!selectableRows.length && selection.selectedIds.length === selectableRows.length} indeterminate={selection.selectedIds.length > 0 && selection.selectedIds.length < selectableRows.length} disabled={busy || !selectionAllowed} onChange={() => { dismissRowDeleteFlow(); selection.handleSelectAll(); }}/></th>}
     {columns.map((column, i) => <th key={column.key} className={`relative px-3 py-2.5 ${i && !column.mobile ? "hidden md:table-cell" : ""}`}><div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-1 [&>*]:max-w-full">{column.header || column.label}</div>{i < columns.length - 1 && <button type="button" aria-label={t("records.resize", { name: column.label })} className="absolute inset-y-2 right-0 hidden w-2 cursor-col-resize touch-none border-r border-gray-200/70 hover:border-gray-400 focus-visible:border-gray-500 focus-visible:outline-none md:block" onPointerDown={event => sizing.start(event, i, table.current?.getBoundingClientRect().width || 800)} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        sizing.resize(i, event.key === "ArrowRight" ? 1 : -1);
    } }}/>}</th>)}
     <th className={`px-2 ${props.mobileActions === false ? "hidden md:table-cell" : ""}`}><span className="sr-only">{t("records.actions")}</span></th>
    </tr></thead>
    <tbody>{virtual.before > 0 && spacer(virtual.before)}{page.rows.slice(virtual.start, virtual.end).map(item => <tr key={item.id} style={props.virtualize || props.rowHeight ? { height: heightFor(item) } : undefined} className={`group border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 ${props.rowClassName?.(item) || ""}`}>
     {selectable && <td className="px-3">{props.rowKind?.(item) !== "summary" && <Checkbox size="small" aria-label={t("records.select", { name: props.getRowName?.(item) ?? String(columns[0]?.render(item) ?? item.id) })} disabled={busy || !selectionAllowed} checked={selection.selectedIds.includes(item.id)} onClick={event => { dismissRowDeleteFlow(); selection.handleSelectRow(item.id, event); }}/>}</td>}
     {columns.map((column, i) => <td key={column.key} className={`px-3 ${i ? (column.mobile ? "text-xs text-gray-500" : "hidden text-xs text-gray-500 md:table-cell") : ""}`}><div className="flex min-w-0 items-center" style={{ minHeight: props.rowHeight ? heightFor(item) - 1 : 40 }}>{i ? <span className="block truncate">{column.render(item)}</span> : inspectable && props.rowKind?.(item) !== "summary" ? <button type="button" disabled={busy} className={`min-w-0 truncate text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-gray-400 ${props.rowHeight ? "py-0" : "py-2"}`} onClick={() => onInspect ? onInspect(item) : setPreviewId(item.id)}>{column.render(item)}</button> : <div className="min-w-0 flex-1 truncate">{column.render(item)}</div>}</div></td>)}
     <td className={`px-2 ${props.mobileActions === false ? "hidden md:table-cell" : ""}`}><div className="flex flex-nowrap items-center justify-end gap-1">{onEdit && canEdit && (props.rowCanEdit?.(item) ?? true) && props.rowKind?.(item) !== "summary" && <button type="button" disabled={busy} aria-label={editLabel} title={editLabel} className="inline-flex h-7 w-7 max-md:h-11 max-md:w-11 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900" onClick={() => onEdit(item)}><Pencil size={13} aria-hidden="true" /></button>}{actions?.(item)}{onDelete && canDelete && (props.rowCanDelete?.(item) ?? true) && props.rowKind?.(item) !== "summary" && <button type="button" disabled={busy} ref={menu?.id === item.id ? anchor : undefined} aria-label={t("records.actions")} aria-expanded={menu?.id === item.id} className="inline-flex h-7 w-7 max-md:h-11 max-md:w-11 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" onClick={event => { selection.clearSelection(); setDeleting([]); setBulkConfirming(false); anchor.current = event.currentTarget; setMenu(item); }}><MoreHorizontal size={15} aria-hidden="true" /></button>}</div></td>
    </tr>)}{virtual.after > 0 && spacer(virtual.after)}</tbody>
   </table>
   {!page.rows.length && !busy && <EmptyState title={emptyLabel} className="px-5" />}
  </div>
  {props.summary}
  {pagination && <footer className={footerClass}><button type="button" disabled={busy || !page.canPrev} aria-label={t("pagination.previous")} onClick={() => void page.prev()}><ChevronLeft size={15} aria-hidden="true" /></button><button type="button" disabled={busy || !page.canNext} aria-label={t("pagination.next")} onClick={() => void page.next()}><ChevronRight size={15} aria-hidden="true" /></button><ResultsPerPage value={page.pageSize} disabled={busy} onChange={page.setPageSize}><span aria-live="polite">{t(page.total === undefined ? "pagination.range" : "pagination.rangeTotal", { start: page.start, end: page.end, count: page.total })}</span></ResultsPerPage></footer>}
  <CompactActionMenu open={!!menu} anchor={anchor} onClose={() => setMenu(null)}><button type="button" onClick={() => { if (menu)
        setDeleting([menu]); setMenu(null); }}>{deleteLabel}</button></CompactActionMenu>
  <ConfirmToast open={!!deleting.length && !bulkConfirming} busy={pending} text={props.deleteConfirmText?.(deleting.length) || t("records.deleteConfirm", { count: deleting.length })} confirmLabel={props.deleteConfirmLabel || deleteLabel} cancelLabel={t("btn.cancel")} onCancel={() => { if (!pending)
        setDeleting([]); }} onConfirm={() => void remove()}/>
  {props.selectionActions && props.selectionActions({ ids: selection.selectedIds, items: selectableRows.filter(item => selection.selectedIds.includes(item.id)), clear: selection.clearSelection })}
  <SelectionBar
    open={!props.selectionActions && selection.selectedIds.length > 0}
    role={bulkConfirming ? "alertdialog" : "region"}
    label={bulkConfirming ? props.deleteConfirmText?.(deleting.length) || t("records.deleteConfirm", { count: deleting.length }) : t("records.selected", { count: selection.selectedIds.length })}
    className="max-w-[320px]"
    layout
    onKeyDown={event => { if (event.key === "Escape" && !pending && bulkConfirming) { event.preventDefault(); event.stopPropagation(); setDeleting([]); setBulkConfirming(false); } }}
  >
      <AnimatePresence mode="wait" initial={false}>
        {bulkConfirming ? <motion.div key="bulk-confirm" initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }} transition={{ duration: reducedMotion ? 0 : .15 }} onAnimationComplete={() => bulkCancelRef.current?.focus({ preventScroll: true })}>
          <p role="status" className="text-xs leading-5 text-gray-700">{props.deleteConfirmText?.(deleting.length) || t("records.deleteConfirm", { count: deleting.length })}</p>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3"><Button ref={bulkCancelRef} type="button" size="sm" variant="outline" disabled={pending} onClick={() => { setDeleting([]); setBulkConfirming(false); }}>{t("btn.cancel")}</Button><Button type="button" size="sm" variant="outlineBlack" isLoading={pending} disabled={pending || busy} onClick={() => void remove()}>{props.deleteConfirmLabel || deleteLabel}</Button></div>
        </motion.div> : <motion.div key="bulk-actions" initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }} transition={{ duration: reducedMotion ? 0 : .15 }} className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-gray-700">{t("records.selected", { count: selection.selectedIds.length })}</span>
          <div className="mt-3 flex w-full items-center justify-end gap-2 border-t border-gray-100 pt-3"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={selection.clearSelection}>{t("records.cancel")}</Button><Button type="button" size="sm" variant="outlineBlack" disabled={busy} onClick={() => { setError(""); setMenu(null); setDeleting(page.rows.filter(item => selection.selectedIds.includes(item.id))); setBulkConfirming(true); }}>{deleteLabel}</Button></div>
        </motion.div>}
      </AnimatePresence>
  </SelectionBar>
  <RecordPreview item={selected} columns={props.previewColumns || [...columns, ...previewFields]} load={props.loadPreview} onClose={() => setPreviewId(null)} onEdit={onEdit && canEdit && (!selected || (props.rowCanEdit?.(selected) ?? true)) ? onEdit : undefined} editLabel={editLabel}/>
 </section>;
}

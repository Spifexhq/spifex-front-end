import { useTranslation } from "react-i18next";
import CompactActionMenu from "@/shared/ui/Popover/CompactActionMenu";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import { accountingErrorMessage } from "../accountingError";
import { useRef, useContext, useEffect, useState, type ReactNode } from "react";
import { Pencil, MoreHorizontal } from "lucide-react";
import SettingsList, { type Pager } from "@/shared/ui/Settings/SettingsList";
import { ListContext } from "@/shared/ui/Settings/SettingsListContext";
import SidePanel from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";

type Column<T> = { key: string; label: string; render(item: T): ReactNode };
type Props<T> = { pager?: Pager; items: T[]; columns: Column<T>[]; emptyLabel: string; editLabel: string; onEdit?: (item: T) => void; onInspect?: (item: T) => void; onDelete?: (item: T) => Promise<unknown>; actions?: (item: T) => ReactNode };
function Records<T extends { id: string }>({ items, columns, emptyLabel, editLabel, onEdit, onInspect, onDelete, actions }: Props<T>) {
  const { t } = useTranslation("accountingSettings");
  const table = useRef<HTMLTableElement>(null);
  const anchor = useRef<HTMLButtonElement | null>(null);
  const [menu, setMenu] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [widths, setWidths] = useState(() => columns.map(() => 100 / columns.length));
  const resize = (i: number, delta: number) => setWidths(previous => {
    const shift = Math.max(6 - previous[i], Math.min(previous[i + 1] - 6, delta));
    const next = [...previous]; next[i] += shift; next[i + 1] -= shift; return next;
  });
  const { index, size, server, setCount } = useContext(ListContext);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find(item => item.id === selectedId);
  useEffect(() => { if (!server) setCount(items.length); }, [items.length, setCount, server]);
  return <>
    {error && <p role="alert" className="p-3 text-xs text-red-700">{error}</p>}
    <CompactActionMenu open={!!menu} onClose={() => setMenu(null)} anchor={anchor}><button type="button" className="w-full rounded px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50" onClick={() => { setDeleting(menu); setMenu(null); }}>{t("table.delete")}</button></CompactActionMenu>
    <ConfirmToast open={!!deleting} busy={busy} text={t("table.deleteConfirm")} confirmLabel={t("table.delete")} cancelLabel={t("common.cancel")} onCancel={() => { if (!busy) setDeleting(null); }} onConfirm={() => { if (!deleting || !onDelete || busy) return; setBusy(true); setError(""); void onDelete(deleting).then(() => { setDeleting(null); setSelectedId(null); }).catch(cause => setError(accountingErrorMessage(cause, t("table.deleteError")))).finally(() => setBusy(false)); }} />
    <div className="max-h-[65dvh] overflow-auto">
      <table ref={table} className="w-full table-fixed text-left text-[13px] md:min-w-[740px]">
        <colgroup>{columns.map((column, i) => <col key={column.key} style={{ width: `${widths[i]}%` }} className={i ? "hidden md:table-column" : ""} />)}<col className={actions ? "w-[180px]" : onDelete ? "w-[80px]" : "w-[40px] md:w-[55px]"} /></colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50"><tr className="border-b border-gray-200 text-xs text-gray-500">{columns.map((column, i) => <th key={column.key} className={`relative px-3 py-2.5 font-medium ${i ? "hidden md:table-cell" : ""}`}>{column.label}{i < columns.length - 1 && <button type="button" role="separator" aria-orientation="vertical" aria-label={column.label} className="absolute inset-y-2 right-0 w-2 touch-none border-r border-gray-200/70 hover:border-gray-400 focus-visible:border-gray-500 focus-visible:outline-none" onPointerDown={event => {
      event.preventDefault(); const start = event.clientX; let last = start; const total = table.current?.getBoundingClientRect().width || 800;
      event.currentTarget.setPointerCapture(event.pointerId);
      const move = (e: PointerEvent) => { resize(i, (e.clientX - last) / total * 100); last = e.clientX; };
      const finish = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish, { once: true }); window.addEventListener("pointercancel", finish, { once: true });
    }} onKeyDown={event => { if (["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); resize(i, event.key === "ArrowRight" ? 1 : -1); } }} />}</th>)}<th className="px-2 py-2.5"><span className="sr-only">{editLabel}</span></th></tr></thead>
        <tbody>{(server ? items : items.slice(index * size, (index + 1) * size)).map(item => <tr key={item.id} className="group border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50">{columns.map((column, i) => <td key={column.key} className={`px-3 ${i ? "hidden text-xs text-gray-500 md:table-cell" : ""}`}><div className="flex min-h-10 min-w-0 items-center">{i ? <span className="block truncate" title={typeof column.render(item) === "string" ? String(column.render(item)) : undefined}>{column.render(item)}</span> : <button type="button" className="min-w-0 truncate py-2 text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-gray-400" onClick={() => onInspect ? onInspect(item) : setSelectedId(item.id)}>{column.render(item)}</button>}</div></td>)}<td className="px-2">{onEdit && <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-gray-400" aria-label={editLabel} title={editLabel} onClick={() => onEdit(item)}><Pencil size={13} /></button>}{actions?.(item)}{onDelete && <button type="button" ref={menu?.id === item.id ? anchor : undefined} aria-label={t("table.actions")} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" onClick={event => { anchor.current = event.currentTarget; setMenu(item); }}><MoreHorizontal size={14} /></button>}</td></tr>)}</tbody>
      </table>
      {!items.length && <p className="px-5 py-12 text-center text-sm text-gray-500">{emptyLabel}</p>}
    </div>
    <SidePanel isOpen={!!selected} title={selected ? String(columns[0].render(selected)) : ""} showFooterHint={false} onClose={() => setSelectedId(null)} footer={selected && onEdit ? <Button variant="outline" onClick={() => { setSelectedId(null); onEdit(selected); }}>{editLabel}</Button> : undefined}>
      {selected && <dl className="divide-y divide-gray-100 text-[13px]">{columns.map(column => <div key={column.key} className="flex justify-between gap-6 py-3"><dt className="text-gray-500">{column.label}</dt><dd className="max-w-[60%] break-words text-right font-medium text-gray-900">{column.render(selected)}</dd></div>)}</dl>}
    </SidePanel>
  </>;
}
export default function AccountingRecords<T extends { id: string }>(props: Props<T>) {
  return <SettingsList pager={props.pager} busy={props.pager?.loading} className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white [&>footer]:border-gray-200 [&>footer]:bg-gray-50/50"><Records {...props} /></SettingsList>;
}

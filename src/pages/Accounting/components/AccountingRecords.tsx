import { useContext, useEffect, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import SettingsList from "@/shared/ui/Settings/SettingsList";
import { ListContext } from "@/shared/ui/Settings/SettingsListContext";
import SidePanel from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";

type Column<T> = { key: string; label: string; render(item: T): ReactNode };
type Props<T> = { items: T[]; columns: Column<T>[]; emptyLabel: string; editLabel: string; onEdit?: (item: T) => void };
function Records<T extends { id: string }>({ items, columns, emptyLabel, editLabel, onEdit }: Props<T>) {
  const { index, size, setCount } = useContext(ListContext);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find(item => item.id === selectedId);
  useEffect(() => setCount(items.length), [items.length, setCount]);
  return <>
    <div className="max-h-[65dvh] min-h-[240px] overflow-auto">
      <table className="w-full table-fixed text-left text-[13px] md:min-w-[740px]">
        <colgroup><col />{columns.slice(1).map(column => <col key={column.key} className="hidden w-[120px] md:table-column" />)}<col className="w-[40px] md:w-[55px]" /></colgroup>
        <thead className="sticky top-0 z-10 bg-gray-50"><tr className="border-b border-gray-200 text-xs text-gray-500">{columns.map((column, i) => <th key={column.key} className={`px-3 py-2.5 font-medium ${i ? "hidden md:table-cell" : ""}`}>{column.label}</th>)}<th className="px-2 py-2.5"><span className="sr-only">{editLabel}</span></th></tr></thead>
        <tbody>{items.slice(index * size, (index + 1) * size).map(item => <tr key={item.id} className="group border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50">{columns.map((column, i) => <td key={column.key} className={`px-3 ${i ? "hidden text-xs text-gray-500 md:table-cell" : ""}`}><div className="flex min-h-10 min-w-0 items-center">{i ? <span className="block truncate" title={typeof column.render(item) === "string" ? String(column.render(item)) : undefined}>{column.render(item)}</span> : <button type="button" className="min-w-0 truncate py-2 text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-gray-400" onClick={() => setSelectedId(item.id)}>{column.render(item)}</button>}</div></td>)}<td className="px-2">{onEdit && <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-gray-400" aria-label={editLabel} title={editLabel} onClick={() => onEdit(item)}><Pencil size={13} /></button>}</td></tr>)}</tbody>
      </table>
      {!items.length && <p className="px-5 py-12 text-center text-sm text-gray-500">{emptyLabel}</p>}
    </div>
    <SidePanel isOpen={!!selected} title={selected ? String(columns[0].render(selected)) : ""} showFooterHint={false} onClose={() => setSelectedId(null)} footer={selected && onEdit ? <Button variant="outline" onClick={() => { setSelectedId(null); onEdit(selected); }}>{editLabel}</Button> : undefined}>
      {selected && <dl className="divide-y divide-gray-100 text-[13px]">{columns.map(column => <div key={column.key} className="flex justify-between gap-6 py-3"><dt className="text-gray-500">{column.label}</dt><dd className="max-w-[60%] break-words text-right font-medium text-gray-900">{column.render(selected)}</dd></div>)}</dl>}
    </SidePanel>
  </>;
}
export default function AccountingRecords<T extends { id: string }>(props: Props<T>) {
  return <SettingsList className="min-w-0 overflow-visible rounded-lg border border-gray-200 bg-white"><Records {...props} /></SettingsList>;
}

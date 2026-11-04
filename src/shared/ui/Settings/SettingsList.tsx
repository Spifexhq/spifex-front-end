import ResultsPerPage from "./ResultsPerPage";
import { settingsRecordName } from "./settingsRecordName";
import SettingsRecordGrid from "./SettingsRecordGrid";
import { RecordActionsContext } from "./RecordActionsContext";
import { ListContext } from "./SettingsListContext";
import { Children, isValidElement, useContext, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
export type Pager = { index: number; pageSize: number; setPageSize(size: number): void; totalCount?: number; items: unknown[]; canPrev: boolean; canNext: boolean; loading: boolean; prev(): unknown; next(): unknown };
export function SettingsRecords({ children, className }: { children: ReactNode; className?: string }) {
  const { index, size, server, setCount } = useContext(ListContext);
  const records = Children.toArray(children);
  const empty = records.length === 1 && isValidElement(records[0]) && records[0].type === "p";
  const count = empty ? 0 : records.length;
  useEffect(() => { if (!server) setCount(count); }, [count, server, setCount]);
  const visible = server || empty ? records : records.slice(index * size, (index + 1) * size);
  const mapped = visible.filter(isValidElement).map(element => {
    const props = element.props as Record<string, unknown>;
    const record = (props.bank || props.dept || props.entity || props.item || props.project || props.member) as Record<string, unknown> | undefined;
    if (!record) return null;
    const keys = props.bank ? ["account_type", "account_number"] : props.member ? ["email", "role"] : props.entity ? ["email", "country"] : props.item ? ["sku", "description"] : ["code", "description"];
    return { id: String(record.id), name: settingsRecordName(record), values: keys.map(key => String(record[key] ?? "—")), labels: keys.map(key => key.replace(/_/g," ")), onEdit: props.onEdit ? () => (props.onEdit as (record: unknown) => void)(record) : undefined };
  });
  return <div className={className}>{mapped.length > 0 && mapped.every(Boolean) ? <SettingsRecordGrid records={mapped.filter((item): item is NonNullable<typeof item> => !!item)} /> : visible}</div>;
}
export default function SettingsList({ children, pager, busy = false, className = "", deleteRecord, onDeleted, deletePermission }: { deleteRecord?: (id: string) => Promise<unknown>; onDeleted?: (ids: string[]) => unknown; deletePermission?: string; children: ReactNode; pager?: Pager; busy?: boolean; className?: string }) {
  const { t } = useTranslation("common");
  const [size, setSize] = useState(20), [index, setIndex] = useState(0), [count, setCount] = useState(0);
  const pageSize = pager?.pageSize ?? size, page = pager?.index ?? index;
  const total = pager?.totalCount ?? (pager ? undefined : count);
  const shown = pager ? pager.items.length : Math.max(0, Math.min(pageSize, count - page * pageSize));
  const start = shown ? page * pageSize + 1 : 0, end = shown ? start + shown - 1 : 0;
  useEffect(() => { if (!pager && index > 0 && index * size >= count) setIndex(Math.max(0, Math.ceil(count / size) - 1)); }, [count, index, size, pager]);
  const disabled = busy || pager?.loading;
  return <RecordActionsContext.Provider value={{ deleteRecord, onDeleted, permission: deletePermission }}><ListContext.Provider value={{ index: page, size: pageSize, server: !!pager, setCount }}><section className={`min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-none ${className}`} aria-busy={disabled || undefined}>
    {children}
    <footer className="flex flex-wrap items-center justify-end gap-1 border-t border-gray-200 bg-gray-50/50 px-3 py-2 [&_button]:inline-flex [&_button]:min-h-8 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1.5 [&_button]:text-xs [&_button]:text-slate-600 [&_button:hover:not(:disabled)]:bg-gray-100 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40 max-md:[&_button]:min-h-10">
      <button type="button" disabled={disabled || (pager ? !pager.canPrev : page === 0)} onClick={() => { if (pager) pager.prev(); else setIndex(value => value - 1); }} aria-label={t("pagination.previous")}><ChevronLeft size={15} /></button>
      <button type="button" disabled={disabled || (pager ? !pager.canNext : end >= count)} onClick={() => { if (pager) pager.next(); else setIndex(value => value + 1); }} aria-label={t("pagination.next")}><ChevronRight size={15} /></button>
      <ResultsPerPage value={pageSize} disabled={disabled} onChange={value => { if (pager) pager.setPageSize(value); else { setSize(value); setIndex(0); } }}>
        <span aria-live="polite">{t(total === undefined ? "pagination.range" : "pagination.rangeTotal", { start, end, count: total })}</span>
      </ResultsPerPage>
    </footer>
  </section></ListContext.Provider></RecordActionsContext.Provider>;
}

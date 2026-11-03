import { settingsRecordName } from "./settingsRecordName";
import SettingsRecordGrid from "./SettingsRecordGrid";
import { RecordActionsContext } from "./RecordActionsContext";
import { ListContext } from "./SettingsListContext";
import { Children, isValidElement, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
type Pager = { index: number; pageSize: number; setPageSize(size: number): void; totalCount?: number; items: unknown[]; canPrev: boolean; canNext: boolean; loading: boolean; prev(): unknown; next(): unknown };
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
  const [size, setSize] = useState(20), [index, setIndex] = useState(0), [count, setCount] = useState(0), [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null); const id = useId();
  const pageSize = pager?.pageSize ?? size, page = pager?.index ?? index;
  const total = pager?.totalCount ?? (pager ? undefined : count);
  const shown = pager ? pager.items.length : Math.max(0, Math.min(pageSize, count - page * pageSize));
  const start = shown ? page * pageSize + 1 : 0, end = shown ? start + shown - 1 : 0;
  useEffect(() => { if (!pager && index > 0 && index * size >= count) setIndex(Math.max(0, Math.ceil(count / size) - 1)); }, [count, index, size, pager]);
  useEffect(() => { if (!open) return; const outside = (e: PointerEvent) => { if (!menu.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside); }, [open]);
  const disabled = busy || pager?.loading;
  return <RecordActionsContext.Provider value={{ deleteRecord, onDeleted, permission: deletePermission }}><ListContext.Provider value={{ index: page, size: pageSize, server: !!pager, setCount }}><section className={`settings-list settings-panel ${className}`} aria-busy={disabled || undefined}>
    {children}
    <footer className="settings-list-footer">
      <button type="button" disabled={disabled || (pager ? !pager.canPrev : page === 0)} onClick={() => { if (pager) pager.prev(); else setIndex(value => value - 1); }} aria-label={t("pagination.previous")}><ChevronLeft size={15} /></button>
      <button type="button" disabled={disabled || (pager ? !pager.canNext : end >= count)} onClick={() => { if (pager) pager.next(); else setIndex(value => value + 1); }} aria-label={t("pagination.next")}><ChevronRight size={15} /></button>
      <div ref={menu} className="relative" onKeyDown={e => { if (e.key === "Escape") { setOpen(false); menu.current?.querySelector('button')?.focus(); } }}>
        <button type="button" className="settings-result-count" disabled={disabled} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
          <span aria-live="polite">{t(total === undefined ? "pagination.range" : "pagination.rangeTotal", { start, end, count: total })}</span><ChevronDown size={12} />
        </button>
        {open && <div id={id} className="settings-page-size" role="group" aria-label={t("pagination.perPage")}><p>{t("pagination.perPage")}</p>{[20, 50, 100].map(value => <button key={value} type="button" aria-pressed={pageSize === value} onClick={() => { if (pager) pager.setPageSize(value); else { setSize(value); setIndex(0); } setOpen(false); menu.current?.querySelector('button')?.focus(); }}>{value}{pageSize === value && <Check size={14} />}</button>)}</div>}
      </div>
    </footer>
  </section></ListContext.Provider></RecordActionsContext.Provider>;
}

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import { formatCurrency, formatDateFromISO } from "@/lib";
import { DialogSkeleton } from "@/components/Modal/FloatingDialog";
import { entryHasSettlements, entryFinancialLocked } from "./entryChanges";
import type { useRecurrenceEntries } from "./useRecurrenceEntries";

export default function RecurrenceEntries({ currentId, series, selectable, onEdit }: { currentId: string; series: ReturnType<typeof useRecurrenceEntries>; selectable: boolean; onEdit(id: string): void }) {
  const { t } = useTranslation("entriesModal");
  if (series.loading) return <DialogSkeleton fields={3} label={t("series.loading")} />;
  if (series.error) return <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p>{t("series.loadError")}</p><Button className="mt-2" type="button" variant="outline" onClick={series.retry}>{t("guidance.retry")}</Button></div>;
  return <section aria-label={t("series.title")} className="overflow-hidden rounded-lg border border-slate-200">
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <h3 className="text-xs font-semibold text-slate-700">{t("series.title")} <span className="font-normal text-slate-400">({series.total ?? series.entries.length})</span></h3>
      {selectable && <div className="flex items-center gap-2 text-xs text-slate-500"><Checkbox checked={series.allSelected} indeterminate={series.someSelected && !series.allSelected} onChange={series.selectAll} aria-label={t("series.selectAll")} />{t("series.selectAll")}</div>}
    </div>
    <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
      {series.pageEntries.map(row => <div key={row.id} className={`flex items-center gap-3 px-3 py-2 ${row.id === currentId ? "bg-slate-50/70" : "bg-white"}`}>
        {selectable && <Checkbox checked={row.id === currentId || series.isSelected(row.id)} disabled={row.id === currentId} onClick={event => series.handleSelectRow(row.id, event)} aria-label={t("series.selectEntry", { index: row.installment_index })} />}
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-700">{row.installment_index}/{row.installment_count} · {formatDateFromISO(row.due_date)}{row.id === currentId && <span className="ml-2 text-[10px] text-slate-400">{t("series.current")}</span>}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><span className={`size-1.5 rounded-full ${entryFinancialLocked(row) ? "bg-amber-500" : "bg-emerald-500"}`} />{t(row.is_settled ? "series.settled" : entryHasSettlements(row) ? "series.partial" : row.financial_locked ? "series.posted" : "series.open")}</p></div>
        <span className="text-xs font-medium tabular-nums text-slate-700">{formatCurrency(row.amount)}</span>
        {row.id !== currentId && <Button type="button" size="sm" variant="outline" className="min-h-10 sm:min-h-8" onClick={() => onEdit(row.id)}>{t("series.edit")}</Button>}
      </div>)}
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
      <span>{t("series.pageRange", { start: series.page * 10 + (series.pageEntries.length ? 1 : 0), end: series.page * 10 + series.pageEntries.length, total: series.total ?? series.entries.length })}</span>
      <div className="flex items-center gap-1"><Button type="button" variant="outline" size="sm" disabled={!series.canPrev} aria-label={t("series.previous")} onClick={() => void series.prev()}><ChevronLeft size={14} /></Button><Button type="button" variant="outline" size="sm" disabled={!series.canNext} aria-label={t("series.next")} onClick={() => void series.next()}><ChevronRight size={14} /></Button></div>
    </div>
    <p className="border-t border-slate-100 px-3 py-2 text-[11px] leading-5 text-slate-500">{t("series.protection")}</p>
  </section>;
}

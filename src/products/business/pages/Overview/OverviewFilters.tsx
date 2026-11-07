import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import Button from "@/shared/ui/Button";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import OverviewFilterPanel from "@/shared/financial/components/Overview/OverviewFilterPanel";
import type { OverviewData, OverviewQuery } from "@/models/finance/overview";
import { periodPreset } from "./overviewUtils";

export default function OverviewFilters({ query, options, onChange, onExport, loading, exportable }: {
  query: OverviewQuery;
  options?: OverviewData["filter_options"];
  onChange(value: OverviewQuery): void;
  onExport(): void;
  loading: boolean;
  exportable: boolean;
}) {
  const { t } = useTranslation("overview");
  const [draft, setDraft] = useState(query);
  const signature = JSON.stringify(query);
  useEffect(() => setDraft(JSON.parse(signature)), [signature]);
  const choose = (key: "bank_id" | "cashflow_category_id", label: string, items: { id: string; label: string }[]) => <Select
    size="sm" label={label} buttonLabel={label} items={items} selected={items.filter(item => item.id === draft[key])}
    onChange={selected => setDraft(previous => ({ ...previous, [key]: selected[0]?.id }))}
    getItemKey={item => item.id} getItemLabel={item => item.label} singleSelect hideCheckboxes
  />;

  return <OverviewFilterPanel toolbar={<>
    <SegmentedControl<OverviewQuery["basis"]> value={query.basis} label={t("basis")}
      items={(["planned", "settled"] as const).map(value => ({ value, label: t(`basisOptions.${value}`) }))}
      onChange={basis => onChange({ ...query, basis, bank_id: undefined })} />
    <div className="flex flex-wrap items-center gap-2">
      {[7, 30, 90].map(days => <Button key={days} variant="ghost" size="sm" onClick={() => onChange({ ...query, ...periodPreset(days) })}>{t("lastDays", { count: days })}</Button>)}
      <Button variant="outline" size="sm" onClick={onExport} disabled={!exportable || loading}><Download size={14} />{t("export")}</Button>
    </div>
  </>} onSubmit={event => { event.preventDefault(); onChange(draft); }}>
    <div className="min-w-36 flex-1"><Input size="sm" kind="date" label={t("from")} value={draft.start_date} max={draft.end_date} onValueChange={value => setDraft(previous => ({ ...previous, start_date: value }))} required /></div>
    <div className="min-w-36 flex-1"><Input size="sm" kind="date" label={t("to")} value={draft.end_date} min={draft.start_date} onValueChange={value => setDraft(previous => ({ ...previous, end_date: value }))} required /></div>
    <div className="min-w-40 flex-1">{choose("cashflow_category_id", t("category"), options?.categories || [])}</div>
    {query.basis === "settled" && !!options?.banks.length && <div className="min-w-40 flex-1">{choose("bank_id", t("bank"), options.banks)}</div>}
    <div className="min-w-40 flex-[1.5]"><Input size="sm" label={t("search")} placeholder={t("searchPlaceholder")} value={draft.description || ""} onChange={event => setDraft(previous => ({ ...previous, description: event.target.value }))} /></div>
    <Button type="submit" variant="primary" size="sm" disabled={loading}>{t("apply")}</Button>
    {(query.bank_id || query.cashflow_category_id || query.description) && <Button variant="ghost" size="sm" onClick={() => onChange({ ...query, bank_id: undefined, cashflow_category_id: undefined, description: undefined })}>{t("clear")}</Button>}
  </OverviewFilterPanel>;
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { accountSections } from "./accountHierarchy";

import { emptyChartFilters, type AccountFilters } from "./accountFilters";

export default function ChartFilters({ onApply }: { onApply(filters: AccountFilters): void }) {
  const { t } = useTranslation("ledgerAccounts");
  const { t: accounting } = useTranslation("accountingSettings");
  const [draft, setDraft] = useState(emptyChartFilters);
  const [open, setOpen] = useState(false);
  const yesNo = [{ value: "true", label: t("workspace.yes") }, { value: "false", label: t("workspace.no") }];
  const controls = [
    { key: "section" as const, label: t("workspace.sectionLabel"), options: accountSections.map(value => ({ value, label: accounting(`common.sections.${value === "off_balance" ? "offBalance" : value}`) })) },
    { key: "type" as const, label: t("workspace.accountTypeLabel"), options: ["header", "posting"].map(value => ({ value, label: t(`modal.${value}`) })) },
    { key: "bank" as const, label: t("workspace.bankControlLabel"), options: yesNo },
    { key: "manual" as const, label: t("workspace.manualPostingLabel"), options: yesNo },
    { key: "active" as const, label: t("workspace.activeLabel"), options: yesNo },
  ];
  return <form onSubmit={event => { event.preventDefault(); onApply(draft); }} className="space-y-3">
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1"><Input kind="text" label={t("workspace.searchLabel")} placeholder={t("workspace.searchPlaceholder")} value={draft.search} onChange={event => setDraft(previous => ({ ...previous, search: event.target.value }))} /></div>
      <Button type="submit" variant="outline">{t("workspace.searchLabel")}</Button>
      <Button type="button" variant="outline" aria-expanded={open} aria-controls="chart-filters" onClick={() => setOpen(!open)}><SlidersHorizontal size={14} /><span className="hidden sm:inline">{t("workspace.filtersTitle")}</span></Button>
    </div>
    {open && <div id="chart-filters" className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{controls.map(control => <Select key={control.key} label={control.label} items={control.options} selected={control.options.filter(option => option.value === draft[control.key])} onChange={selected => setDraft(previous => ({ ...previous, [control.key]: selected[0]?.value ?? "" }))} getItemKey={item => item.value} getItemLabel={item => item.label} singleSelect hideCheckboxes />)}</div>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="cancel" onClick={() => { setDraft(emptyChartFilters); onApply(emptyChartFilters); }}>{t("workspace.clearFilters")}</Button><Button type="submit">{t("workspace.applyFilters")}</Button></div>
    </div>}
  </form>;
}

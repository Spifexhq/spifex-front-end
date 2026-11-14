import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import Popover from "@/shared/ui/Popover";
import SettingsSurface from "@/shared/ui/Settings/SettingsSurface";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsClearFilters, SettingsFilter } from "@/shared/ui/Settings/SettingsFilter";
import { accountSections } from "./accountHierarchy";
import { emptyChartFilters, type AccountFilters } from "./accountFilters";

type FilterKey = keyof AccountFilters;
type Control = { key: Exclude<FilterKey, "search">; label: string; options: Array<{ value: string; label: string }> };

export default function ChartFilters({ value, onApply }: { value: AccountFilters; onApply(filters: AccountFilters): void }) {
  const { t } = useTranslation("ledgerAccounts");
  const { t: accounting } = useTranslation("accountingSettings");
  const [draft, setDraft] = useState<AccountFilters>(value);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const anchors = useRef<Record<string, HTMLDivElement | null>>({});
  const searchAnchor = useRef<HTMLDivElement | null>(null);
  useEffect(() => setDraft(value), [value]);

  const yesNo = [{ value: "true", label: t("workspace.yes") }, { value: "false", label: t("workspace.no") }];
  const controls: Control[] = [
    { key: "section", label: t("workspace.sectionLabel"), options: accountSections.map(section => ({ value: section, label: accounting(`common.sections.${section === "off_balance" ? "offBalance" : section}`) })) },
    { key: "type", label: t("workspace.accountTypeLabel"), options: ["header", "posting"].map(accountType => ({ value: accountType, label: t(`modal.${accountType}`) })) },
    { key: "bank", label: t("workspace.bankControlLabel"), options: yesNo },
    { key: "manual", label: t("workspace.manualPostingLabel"), options: yesNo },
    { key: "active", label: t("workspace.activeLabel"), options: yesNo },
  ];

  const hasApplied = Boolean(value.search || value.section || value.type || value.bank || value.manual || value.active !== "true");
  const labelFor = (control: Control, raw: string) => control.options.find(option => option.value === raw)?.label || raw;
  const applyControl = (key: Exclude<FilterKey, "search">) => {
    const next = { ...value, [key]: draft[key] };
    onApply(next);
    setDraft(next);
    setOpenKey(null);
  };
  const applySearch = () => {
    const next = { ...value, search: draft.search.trim() };
    onApply(next);
    setDraft(next);
    setOpenKey(null);
  };
  const resetControl = (key: FilterKey) => setDraft(previous => ({ ...previous, [key]: "" }));
  const clearControl = (key: Exclude<FilterKey, "search">) => {
    const next = { ...value, [key]: "" };
    onApply(next);
    setDraft(next);
    setOpenKey(null);
  };
  const clearSearch = () => {
    const next = { ...value, search: "" };
    onApply(next);
    setDraft(next);
    setOpenKey(null);
  };
  const clearAll = () => {
    onApply(emptyChartFilters);
    setDraft(emptyChartFilters);
    setOpenKey(null);
  };

  return <SettingsSurface>
    <form onSubmit={event => { event.preventDefault(); applySearch(); }}>
      <div className="settings-toolbar">
        <SettingsFilters active={hasApplied}>
          <div ref={searchAnchor}>
            <SettingsFilter
              label={t("workspace.searchLabel")}
              value={value.search ? `• ${value.search}` : undefined}
              active={Boolean(value.search)}
              expanded={openKey === "search"}
              onClick={() => setOpenKey(previous => previous === "search" ? null : "search")}
              onClear={value.search ? clearSearch : undefined}
            />
            <Popover appearance="settings" open={openKey === "search"} onClose={() => setOpenKey(null)} anchorRef={searchAnchor} title={t("workspace.searchLabel")} width={420}>
              <div className="space-y-3">
                <Input kind="text" aria-label={t("workspace.searchLabel")} placeholder={t("workspace.searchPlaceholder")} value={draft.search} onChange={event => setDraft(previous => ({ ...previous, search: event.target.value }))} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); applySearch(); } }} />
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="text-xs text-gray-600 hover:text-gray-900" onClick={() => resetControl("search")}>{t("workspace.clearFilters")}</button>
                  <Button type="button" size="sm" onClick={applySearch}>{t("workspace.applyFilters")}</Button>
                </div>
              </div>
            </Popover>
          </div>
          {controls.map(control => {
            const active = Boolean(value[control.key]);
            return <div key={control.key} ref={element => { anchors.current[control.key] = element; }}>
              <SettingsFilter
                label={control.label}
                value={active ? `• ${labelFor(control, value[control.key])}` : undefined}
                active={active}
                expanded={openKey === control.key}
                onClick={() => setOpenKey(previous => previous === control.key ? null : control.key)}
                onClear={active ? () => clearControl(control.key) : undefined}
              />
              <Popover appearance="settings" open={openKey === control.key} onClose={() => setOpenKey(null)} anchorRef={{ current: anchors.current[control.key] }} title={control.label} width={360}>
                <div className="space-y-3">
                  <Select
                    ariaLabel={control.label}
                    buttonLabel={t("workspace.any", { defaultValue: "Any" })}
                    items={control.options}
                    selected={control.options.filter(option => option.value === draft[control.key])}
                    onChange={selected => setDraft(previous => ({ ...previous, [control.key]: selected[0]?.value || "" }))}
                    getItemKey={item => item.value}
                    getItemLabel={item => item.label}
                    singleSelect
                    hideCheckboxes
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" className="text-xs text-gray-600 hover:text-gray-900" onClick={() => resetControl(control.key)}>{t("workspace.clearFilters")}</button>
                    <Button type="button" size="sm" onClick={() => applyControl(control.key)}>{t("workspace.applyFilters")}</Button>
                  </div>
                </div>
              </Popover>
            </div>;
          })}
          {hasApplied && <SettingsClearFilters label={t("workspace.clearFilters")} onClick={clearAll}/>}
        </SettingsFilters>
      </div>
    </form>
  </SettingsSurface>;
}

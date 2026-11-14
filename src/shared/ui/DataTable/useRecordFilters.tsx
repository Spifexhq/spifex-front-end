import { useEffect, useRef, useState } from "react";
import { useCursorPager, type FetchPage } from "@/hooks/useCursorPager";
import { matchesRecordFilters } from "./recordFiltering";
import { useTranslation } from "react-i18next";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import Popover from "@/shared/ui/Popover";
import SettingsSurface from "@/shared/ui/Settings/SettingsSurface";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsClearFilters, SettingsFilter } from "@/shared/ui/Settings/SettingsFilter";

type Control<T> = { key: string; label: string; value(item: T): string; format?(value: string): string; date?: "from" | "to" };

/**
 * Shared record filter toolbar.
 *
 * The visual language intentionally mirrors Settings: search, filter chips and
 * per-filter popovers, with an expandable chip group on mobile.
 */
export function useRecordFilters<T>(
  items: T[],
  controls: Control<T>[],
  searchValue: (item: T) => string,
  remote?: {
    key: string;
    enabled?: boolean;
    fetchPage(filters: Record<string, string>, cursor?: string, pageSize?: number): ReturnType<FetchPage<T, { options: Record<string, string[]>; optionLabels: Record<string, Record<string, string>> }>>;
    placeholder: string;
    onItems(items: T[]): void;
  }
) {
  const { t } = useTranslation("common");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [openKey, setOpenKey] = useState<string | null>(null);
  const anchors = useRef<Record<string, HTMLDivElement | null>>({});
  const engine = useCursorPager<T, { options: Record<string, string[]>; optionLabels: Record<string, Record<string, string>> }>(
    (cursor, size) => remote ? remote.fetchPage(applied, cursor, size) : Promise.resolve({ items: [] }),
    { autoLoadFirst: !!remote && remote.enabled !== false, deps: [remote?.key, applied] }
  );
  const pager = { ...engine, options: engine.metadata?.options || {}, optionLabels: engine.metadata?.optionLabels || {} };
  const onItems = remote?.onItems;
  useEffect(() => { onItems?.(pager.items); }, [pager.items, onItems]);
  const rows = remote ? pager.items : items.filter(item => matchesRecordFilters(item, applied, controls, searchValue));
  const hasApplied = Object.values(applied).some(Boolean);

  const chipValue = (control: Control<T>, value: string) => {
    const optionLabel = remote ? pager.optionLabels[control.key]?.[value] : undefined;
    return optionLabel || control.format?.(value) || value;
  };

  const applyControl = (key: string) => {
    setApplied(previous => ({ ...previous, [key]: (draft[key] || "").trim() }));
    setOpenKey(null);
  };

  const clearControl = (key: string) => {
    setDraft(previous => ({ ...previous, [key]: "" }));
    setApplied(previous => ({ ...previous, [key]: "" }));
    setOpenKey(null);
  };

  const clearAll = () => {
    setDraft({});
    setApplied({});
    setOpenKey(null);
  };

  const filters = <SettingsSurface>
    <form
      className="settings-toolbar"
      onSubmit={event => {
        event.preventDefault();
        setApplied(previous => ({ ...previous, search: (draft.search || "").trim() }));
      }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              kind="text"
              label={t("tableFilters.search")}
              placeholder={remote?.placeholder || t("tableFilters.placeholder")}
              value={draft.search || ""}
              onChange={event => setDraft(previous => ({ ...previous, search: event.target.value }))}
            />
          </div>
          <Button type="submit" variant="outline">{t("tableFilters.search")}</Button>
        </div>
      </div>

      <div className="shrink-0">
        <SettingsFilters active={hasApplied}>
          {controls.map(control => {
            const active = Boolean(applied[control.key]);
            const options = (remote ? pager.options[control.key] || [] : [...new Set(items.map(control.value).filter(Boolean))].sort()).map(value => ({
              value,
              label: (remote ? pager.optionLabels[control.key]?.[value] : undefined) || control.format?.(value) || value,
            }));
            return <div key={control.key} ref={element => { anchors.current[control.key] = element; }}>
              <SettingsFilter
                label={control.label}
                value={active ? `• ${chipValue(control, applied[control.key])}` : undefined}
                active={active}
                expanded={openKey === control.key}
                onClick={() => setOpenKey(previous => previous === control.key ? null : control.key)}
                onClear={active ? () => clearControl(control.key) : undefined}
              />
              <Popover
                appearance="settings"
                open={openKey === control.key}
                onClose={() => setOpenKey(null)}
                anchorRef={{ current: anchors.current[control.key] }}
                title={control.label}
              >
                <div className="space-y-3">
                  {control.date
                    ? <Input kind="date" label={control.label} value={draft[control.key] || ""} onValueChange={value => setDraft(previous => ({ ...previous, [control.key]: value }))}/>
                    : <Select
                        label={control.label}
                        items={options}
                        selected={options.filter(option => option.value === draft[control.key])}
                        onChange={selected => setDraft(previous => ({ ...previous, [control.key]: selected[0]?.value || "" }))}
                        getItemKey={item => item.value}
                        getItemLabel={item => item.label}
                        singleSelect
                        hideCheckboxes
                      />}
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" className="text-xs text-gray-600 hover:text-gray-900" onClick={() => clearControl(control.key)}>{t("input.clear")}</button>
                    <Button type="button" size="sm" onClick={() => applyControl(control.key)}>{t("tableFilters.apply")}</Button>
                  </div>
                </div>
              </Popover>
            </div>;
          })}
          {hasApplied && <SettingsClearFilters label={t("tableFilters.clear")} onClick={clearAll}/>}
        </SettingsFilters>
      </div>
    </form>
  </SettingsSurface>;

  return { rows, filters, pager, key: JSON.stringify(applied) };
}

import { ChevronDown, ListFilter, X } from "lucide-react";
import { useTranslation } from "react-i18next";

type FilterProps = { label: string; value?: string; active: boolean; expanded?: boolean; onClick(): void; onClear?: () => void; disabled?: boolean };
/** A filter trigger and a separate, keyboard-accessible clear action. */
export function SettingsFilter({ label, value, active, expanded, onClick, onClear, disabled }: FilterProps) {
  const { t } = useTranslation("common");
  return <div className="settings-filter" data-active={active || undefined}>
    <button type="button" onClick={onClick} disabled={disabled} aria-haspopup="dialog" aria-expanded={expanded} className="settings-filter-trigger">
      <ListFilter size={13} aria-hidden="true" /><span>{label}</span>
      {active && value && <span className="settings-filter-value">{value.replace(/^•\s*/, "")}</span>}
      <ChevronDown size={12} aria-hidden="true" />
    </button>
    {active && onClear && <button type="button" disabled={disabled} onClick={onClear} className="settings-filter-clear" aria-label={`${t("input.clear")}: ${label}`}><X size={12} /></button>}
  </div>;
}
export function SettingsClearFilters({ label, onClick, disabled }: { label: string; onClick(): void; disabled?: boolean }) {
  return <button type="button" className="settings-clear-filters" onClick={onClick} disabled={disabled}><X size={13} aria-hidden="true" />{label}</button>;
}

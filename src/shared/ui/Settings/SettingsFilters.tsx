import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ListFilter } from "lucide-react";
import { useTranslation } from "react-i18next";
/** Desktop filters remain visible; mobile users can expand them on demand. */
export default function SettingsFilters({ children, active }: { children: ReactNode; active: boolean }) {
  const { t } = useTranslation("common");
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  return <div className="settings-filter-group" data-expanded={expanded}>
    <button type="button" className="settings-filters-toggle" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls={id}>
      <ListFilter size={14} aria-hidden="true" />{t("settings.filters")}
      {active && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accentPrimary)]" aria-label={t("settings.activeFilters")} />}
      <ChevronDown size={13} aria-hidden="true" className={expanded ? "rotate-180" : ""} />
    </button>
    <div id={id} className="settings-filter-items" data-expanded={expanded}>{children}</div>
  </div>;
}

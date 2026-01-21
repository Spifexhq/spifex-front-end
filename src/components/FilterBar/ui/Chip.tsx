import React, { useMemo } from "react";
import type { TFunction } from "i18next";
import type { FilterIcon } from "../FilterBar.types";
import { Calendar, Landmark, Receipt, StickyNote } from "lucide-react";

export const Chip: React.FC<{
  t: TFunction;
  icon?: FilterIcon;
  label: string;
  onClick(): void;
  onRemove(): void;
}> = ({ t, icon, label, onClick, onRemove }) => {
  const iconNode = useMemo(() => {
    const cls = "h-4 w-4 text-gray-600";
    if (icon === "calendar") return <Calendar className={cls} aria-hidden />;
    if (icon === "bank") return <Landmark className={cls} aria-hidden />;
    if (icon === "accounts") return <Receipt className={cls} aria-hidden />;
    if (icon === "note") return <StickyNote className={cls} aria-hidden />;
    return null;
  }, [icon]);

  return (
    <div
      className="shrink-0 inline-flex items-center gap-1 text-xs border border-gray-300 rounded-md px-2 h-7 sm:h-6 bg-white cursor-pointer"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      {iconNode}
      <span className="truncate max-w-[160px] sm:max-w-[220px]">{label}</span>
      <button
        aria-label={t("filterBar:aria.removeFilter")}
        className="ml-1 rounded px-1 text-gray-500 hover:bg-gray-200"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        type="button"
      >
        ×
      </button>
    </div>
  );
};

import type { MouseEvent } from "react";
import type { TFunction } from "i18next";
import { Calendar, Landmark, Receipt, StickyNote, X } from "lucide-react";
import type { FilterIcon } from "../FilterBar.types";

export function Chip({ t, icon, label, onClick, onRemove }: {
  t: TFunction; icon?: FilterIcon; label: string;
  onClick(event: MouseEvent<HTMLButtonElement>): void; onRemove(): void;
}) {
  const Icon = icon === "calendar" ? Calendar : icon === "bank" ? Landmark : icon === "accounts" ? Receipt : StickyNote;
  return <span className="inline-flex max-w-full items-center rounded-md border border-gray-200 bg-gray-50 text-[11px] text-gray-600">
    <button type="button" onClick={onClick} className="inline-flex min-w-0 items-center gap-1.5 rounded-l-md py-1 pl-2 pr-1 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]">
      <Icon size={12} className="shrink-0 text-gray-400" aria-hidden /><span className="max-w-52 truncate">{label}</span>
    </button>
    <button type="button" aria-label={`${t("filterBar:aria.removeFilter")}: ${label}`} onClick={onRemove}
      className="mr-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]"><X size={11} aria-hidden /></button>
  </span>;
}

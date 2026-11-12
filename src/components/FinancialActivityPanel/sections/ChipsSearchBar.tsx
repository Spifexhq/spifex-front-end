import type { RefObject } from "react";
import type { TFunction } from "i18next";
import { Search } from "lucide-react";
import TextInput from "@/shared/ui/Input/TextInput";
import type { LocalFilters } from "@/models/components/filterBar";

export function ChipsSearchBar({ t, localFilters, searchInputRef, onSearchEnter, onSearchChange }: {
  t: TFunction; localFilters: LocalFilters; searchInputRef: RefObject<HTMLInputElement>;
  onSearchEnter(): void; onSearchChange(value: string): void;
}) {
  return <div className="relative min-w-0 basis-full sm:max-w-sm sm:flex-1 sm:basis-52">
    <Search size={15} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
    <TextInput ref={searchInputRef} size="sm" className="h-8! pl-8! text-xs!"
      aria-label={t("filterBar:search.label")} placeholder={t("filterBar:search.placeholder")}
      value={localFilters.description || ""} onChange={event => onSearchChange(event.target.value)}
      onKeyDown={event => { if (event.key === "Enter") onSearchEnter(); }} />
  </div>;
}

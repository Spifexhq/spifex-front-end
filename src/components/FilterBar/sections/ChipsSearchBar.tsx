import React from "react";
import type { TFunction } from "i18next";

import type { FilterDefinition } from "../FilterBar.types";
import type { LocalFilters, ChipKey } from "@/models/components/filterBar";
import type { BankAccountTableRow } from "@/models/settings/banking";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";

import { Chip } from "../ui/Chip";

export const ChipsSearchBar: React.FC<{
  t: TFunction;

  filterDefs: FilterDefinition[];
  localFilters: LocalFilters;
  selectedBanks: BankAccountTableRow[];
  selectedAccounts: LedgerAccount[];

  openEditor: ChipKey | null;
  onToggleEditor: (key: ChipKey) => void;
  onRemoveChip: (key: ChipKey) => void;

  searchInputRef: React.RefObject<HTMLInputElement>;
  onSearchEnter: () => void;
  onSearchChange: (value: string) => void;
}> = ({
  t,
  filterDefs,
  localFilters,
  selectedBanks,
  selectedAccounts,
  openEditor,
  onToggleEditor,
  onRemoveChip,
  searchInputRef,
  onSearchEnter,
  onSearchChange,
}) => {
  return (
    <div
      className={[
        "flex-1",
        "flex flex-wrap items-center gap-2",
        "border border-gray-300 rounded-md px-2",
        // allow the container to grow if it wraps
        "min-h-10 sm:min-h-8 py-1",
        // IMPORTANT: remove nowrap + horizontal scroll
        "bg-white",
      ].join(" ")}
    >
      {filterDefs
        .filter((d) => d.isActive(localFilters))
        .map((d) => (
          <Chip
            key={d.key}
            t={t}
            icon={d.icon}
            label={d.getChipLabel({ t, filters: localFilters, selectedBanks, selectedAccounts })}
            onClick={() => onToggleEditor(openEditor === d.key ? d.key : d.key)}
            onRemove={() => onRemoveChip(d.key)}
          />
        ))}

      <input
        ref={searchInputRef}
        className={[
          // take remaining space on the current line, but allow wrapping
          "flex-1",
          "min-w-[160px] sm:min-w-[200px]",
          "h-7 sm:h-6",
          "bg-transparent outline-none text-xs placeholder-gray-400",
        ].join(" ")}
        placeholder={t("filterBar:search.placeholder")}
        value={localFilters.description || ""}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearchEnter();
        }}
      />
    </div>
  );
};

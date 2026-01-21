import type React from "react";
import type { TFunction } from "i18next";

import type { ChipKey, LocalFilters } from "@/models/components/filterBar";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { BankAccountTableRow } from "@/models/settings/banking";

export type FilterIcon = "calendar" | "bank" | "accounts" | "note";

export type FilterEditorProps = {
  t: TFunction;
  isMobile: boolean;

  localFilters: LocalFilters;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFilters>>;

  bankOptions: BankAccountTableRow[];
  selectedBanks: BankAccountTableRow[];

  ledgerAccountsForPicker: LedgerAccount[];
  selectedAccounts: LedgerAccount[];

  onRemove: () => void;
  onApply: () => void;
};

export type FilterDefinition = {
  key: ChipKey;
  icon?: FilterIcon;

  // Add Filter menu placement
  menuGroup: number; // group index; separators inserted between different groups
  menuLabelKey: string; // e.g. "filterBar:menu.date"
  editorTitleKey: string; // e.g. "filterBar:menu.date"

  // Popover sizing for this editor
  popoverClassName: string;

  // Used for chips & active count
  isActive: (filters: LocalFilters) => boolean;

  // Chip label
  getChipLabel: (args: {
    t: TFunction;
    filters: LocalFilters;
    selectedBanks: BankAccountTableRow[];
    selectedAccounts: LedgerAccount[];
  }) => string;

  // Clear filter (used by chip remove)
  clear: (prev: LocalFilters) => LocalFilters;

  // Editor component
  Editor: React.FC<FilterEditorProps>;
};

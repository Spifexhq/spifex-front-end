import type React from "react";
import type { TFunction } from "i18next";

import type { ChipKey, LocalFilters } from "@/models/components/filterBar";
import type { BankAccountTableRow } from "@/models/settings/banking";
import type { CashflowCategoryOption } from "@/models/entries/entries";

export type FilterIcon = "calendar" | "bank" | "accounts" | "note";

export type FilterEditorProps = {
  t: TFunction;
  isMobile: boolean;

  localFilters: LocalFilters;
  setLocalFilters: React.Dispatch<React.SetStateAction<LocalFilters>>;

  bankOptions: BankAccountTableRow[];
  selectedBanks: BankAccountTableRow[];

  categoriesForPicker: CashflowCategoryOption[];
  selectedCategories: CashflowCategoryOption[];

  onRemove: () => void;
  onApply: () => void;
};

export type FilterDefinition = {
  key: ChipKey;
  icon?: FilterIcon;

  menuGroup: number;
  menuLabelKey: string;
  editorTitleKey: string;
  popoverClassName: string;

  isActive: (filters: LocalFilters) => boolean;

  getChipLabel: (args: {
    t: TFunction;
    filters: LocalFilters;
    selectedBanks: BankAccountTableRow[];
    selectedCategories: CashflowCategoryOption[];
  }) => string;

  clear: (prev: LocalFilters) => LocalFilters;
  Editor: React.FC<FilterEditorProps>;
};
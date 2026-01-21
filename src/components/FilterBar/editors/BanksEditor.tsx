import React from "react";
import SelectDropdown from "@/shared/ui/SelectDropdown/SelectDropdown";
import Button from "@/shared/ui/Button";

import type { FilterEditorProps } from "../FilterBar.types";
import type { BankAccountTableRow } from "@/models/settings/banking";

export const BanksEditor: React.FC<FilterEditorProps> = ({
  t,
  bankOptions,
  selectedBanks,
  setLocalFilters,
  onRemove,
  onApply,
}) => (
  <>
    <SelectDropdown<BankAccountTableRow>
      label={t("filterBar:editors.banks.label")}
      items={bankOptions}
      selected={selectedBanks}
      onChange={(list) => setLocalFilters((prev) => ({ ...prev, bank_id: list.map((x) => String(x.id)) }))}
      getItemKey={(item) => item.id}
      getItemLabel={(item) => item.institution}
      buttonLabel={t("filterBar:editors.banks.button")}
      customStyles={{ maxHeight: "240px" }}
    />

    <div className="flex justify-end gap-2 mt-3">
      <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={onRemove}>
        {t("filterBar:buttons.remove")}
      </Button>
      <Button variant="outline" size="sm" className="font-semibold bg-white hover:bg-gray-50" onClick={onApply}>
        {t("filterBar:buttons.apply")}
      </Button>
    </div>
  </>
);

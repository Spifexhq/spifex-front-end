import React from "react";
import SelectDropdown from "@/shared/ui/SelectDropdown/SelectDropdown";
import Button from "@/shared/ui/Button";

import type { FilterEditorProps } from "../FilterBar.types";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";

export const AccountsEditor: React.FC<FilterEditorProps> = ({
  t,
  ledgerAccountsForPicker,
  selectedAccounts,
  setLocalFilters,
  onRemove,
  onApply,
}) => (
  <>
    <SelectDropdown<LedgerAccount>
      label={t("filterBar:editors.accounts.label")}
      items={ledgerAccountsForPicker}
      selected={selectedAccounts}
      onChange={(list) =>
        setLocalFilters((prev) => ({
          ...prev,
          ledger_account_id: list.map((x) => String(x.id)),
        }))
      }
      getItemKey={(item) => item.id}
      getItemLabel={(item) => (item.code ? `${item.code} — ${item.account}` : item.account)}
      buttonLabel={t("filterBar:editors.accounts.button")}
      customStyles={{ maxHeight: "240px" }}
      groupBy={(i) => (i.subcategory ? `${i.category} / ${i.subcategory}` : String(i.category || ""))}
      virtualize
      virtualRowHeight={32}
      virtualThreshold={300}
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

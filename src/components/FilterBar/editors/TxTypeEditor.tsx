import React from "react";
import Button from "@/shared/ui/Button";
import type { FilterEditorProps } from "../FilterBar.types";

export const TxTypeEditor: React.FC<FilterEditorProps> = ({ t, setLocalFilters, onRemove, onApply }) => (
  <>
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="sm"
        className="bg-white hover:bg-gray-50"
        onClick={() => setLocalFilters((prev) => ({ ...prev, tx_type: "credit" }))}
      >
        {t("filterBar:editors.txType.credit")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="bg-white hover:bg-gray-50"
        onClick={() => setLocalFilters((prev) => ({ ...prev, tx_type: "debit" }))}
      >
        {t("filterBar:editors.txType.debit")}
      </Button>
    </div>

    <div className="flex justify-end gap-2 mt-3">
      <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={onRemove}>
        {t("filterBar:buttons.remove")}
      </Button>
      <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50" onClick={onApply}>
        {t("filterBar:buttons.apply")}
      </Button>
    </div>
  </>
);

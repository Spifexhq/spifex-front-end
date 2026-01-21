import React from "react";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";

import type { FilterEditorProps } from "../FilterBar.types";

export const AmountEditor: React.FC<FilterEditorProps> = ({ t, localFilters, setLocalFilters, onRemove, onApply }) => (
  <>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs text-gray-600 space-y-1 block">
        <span className="block">{t("filterBar:editors.amount.min")}</span>
        <Input
          kind="amount"
          display="currency"
          value={localFilters.amount_min || ""}
          onValueChange={(next: string) => setLocalFilters((prev) => ({ ...prev, amount_min: next }))}
          zeroAsEmpty
        />
      </label>

      <label className="text-xs text-gray-600 space-y-1 block">
        <span className="block">{t("filterBar:editors.amount.max")}</span>
        <Input
          kind="amount"
          display="currency"
          value={localFilters.amount_max || ""}
          onValueChange={(next: string) => setLocalFilters((prev) => ({ ...prev, amount_max: next }))}
          zeroAsEmpty
        />
      </label>
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

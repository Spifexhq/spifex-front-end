import React from "react";
import Select from "src/shared/ui/Select/Select";
import Button from "@/shared/ui/Button";

import type { FilterEditorProps } from "../FilterBar.types";
import type { CashflowCategory } from "@/models/settings/categories";

const categoryLabel = (item: CashflowCategory) =>
  [item.code, item.name].filter(Boolean).join(" — ") || item.name || "—";

export const CategoriesEditor: React.FC<FilterEditorProps> = ({
  t,
  categoriesForPicker,
  selectedCategories,
  setLocalFilters,
  onRemove,
  onApply,
}) => (
  <>
    <Select<CashflowCategory>
      label={t("filterBar:editors.categories.label")}
      items={categoriesForPicker}
      selected={selectedCategories}
      onChange={(list) =>
        setLocalFilters((prev) => ({
          ...prev,
          cashflow_category_id: list.map((x) => String(x.id)),
        }))
      }
      getItemKey={(item) => item.id}
      getItemLabel={categoryLabel}
      buttonLabel={t("filterBar:editors.categories.button")}
      customStyles={{ maxHeight: "240px" }}
      groupBy={(i) => (i.parent_id ? "Child categories" : "Root categories")}
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

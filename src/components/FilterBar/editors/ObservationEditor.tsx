import React from "react";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";

import type { FilterEditorProps } from "../FilterBar.types";

export const ObservationEditor: React.FC<FilterEditorProps> = ({
  t,
  localFilters,
  setLocalFilters,
  onRemove,
  onApply,
}) => (
  <>
    <Input
      kind="text"
      placeholder={t("filterBar:editors.observation.placeholder")}
      value={localFilters.observation || ""}
      onChange={(e) => setLocalFilters((prev) => ({ ...prev, observation: e.currentTarget.value }))}
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

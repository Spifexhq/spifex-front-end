import React from "react";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";

import type { FilterEditorProps } from "../FilterBar.types";
import { addDaysLocal, addMonthsLocal, addYearsLocal, toISODateLocal } from "../FilterBar.utils";
import { QuickButton } from "../ui/QuickButton";

export const DateEditor: React.FC<FilterEditorProps> = ({ t, localFilters, setLocalFilters, onRemove, onApply }) => (
  <>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs text-gray-600 space-y-1 block">
        <span className="block">{t("filterBar:editors.date.start")}</span>
        <Input
          kind="date"
          value={localFilters.start_date || ""}
          onValueChange={(iso) => setLocalFilters((prev) => ({ ...prev, start_date: iso }))}
        />
      </label>

      <label className="text-xs text-gray-600 space-y-1 block">
        <span className="block">{t("filterBar:editors.date.end")}</span>
        <Input
          kind="date"
          value={localFilters.end_date || ""}
          onValueChange={(iso) => setLocalFilters((prev) => ({ ...prev, end_date: iso }))}
        />
      </label>
    </div>

    <div className="mt-2">
      <div className="text-[11px] text-gray-500 mb-1">{t("filterBar:editors.date.shortcuts")}</div>

      <div className="flex items-center gap-2 flex-wrap">
        <QuickButton
          onClick={() => {
            const now = new Date();
            const start = toISODateLocal(now);
            setLocalFilters((prev) => ({ ...prev, start_date: start, end_date: start }));
          }}
        >
          {t("filterBar:editors.date.today")}
        </QuickButton>

        <QuickButton
          onClick={() => {
            const now = new Date();
            const start = toISODateLocal(now);
            const end = toISODateLocal(addDaysLocal(now, 7));
            setLocalFilters((prev) => ({ ...prev, start_date: start, end_date: end }));
          }}
        >
          {t("filterBar:editors.date.thisWeek")}
        </QuickButton>

        <QuickButton
          onClick={() => {
            const now = new Date();
            const start = toISODateLocal(now);
            const end = toISODateLocal(addMonthsLocal(now, 1));
            setLocalFilters((prev) => ({ ...prev, start_date: start, end_date: end }));
          }}
        >
          {t("filterBar:editors.date.thisMonth")}
        </QuickButton>

        <QuickButton
          onClick={() => {
            const now = new Date();
            const start = toISODateLocal(now);
            const end = toISODateLocal(addMonthsLocal(now, 3));
            setLocalFilters((prev) => ({ ...prev, start_date: start, end_date: end }));
          }}
        >
          {t("filterBar:editors.date.thisQuarter")}
        </QuickButton>

        <QuickButton
          onClick={() => {
            const now = new Date();
            const start = toISODateLocal(now);
            const end = toISODateLocal(addYearsLocal(now, 1));
            setLocalFilters((prev) => ({ ...prev, start_date: start, end_date: end }));
          }}
        >
          {t("filterBar:editors.date.thisYear")}
        </QuickButton>
      </div>
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

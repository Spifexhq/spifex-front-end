// src/components/Modal/Tab.recurrence.tsx

import React, { useCallback, useMemo } from "react";
import type { TFunction } from "i18next";

import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import type { FormData, PeriodOption, RecurrenceOption } from "../Modal.types";

type WeekendOption = { id: number; label: string; value: 1 | -1 };

type Props = {
  t: TFunction;

  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;

  periodOptions: PeriodOption[];
  installmentsInputId: string;

  isRecurrenceLocked: boolean;
};

const RecurrenceTab: React.FC<Props> = ({
  t,
  formData,
  setFormData,
  periodOptions,
  installmentsInputId,
  isRecurrenceLocked,
}) => {
  const recurrenceOptions = useMemo<RecurrenceOption[]>(
    () => [
      { id: 1, label: t("entriesModal:recurrence.yes"), value: 1 },
      { id: 2, label: t("entriesModal:recurrence.no"), value: 0 },
    ],
    [t]
  );

  const selectedRecurrence = useMemo<RecurrenceOption[]>(
    () => (formData.recurrence.recurrence === 1 ? [recurrenceOptions[0]] : [recurrenceOptions[1]]),
    [formData.recurrence.recurrence, recurrenceOptions]
  );

  const handleRecurrenceChange = useCallback(
    (v: RecurrenceOption[]) => {
      if (isRecurrenceLocked) return;

      const next = v[0]?.value ?? 0;

      setFormData((p) => {
        // If turning recurrence off, clear recurrence-only fields to prevent stale data.
        if (next !== 1) {
          return {
            ...p,
            recurrence: {
              ...p.recurrence,
              recurrence: 0,
              installments: "",
              periods: 1,
              weekend: "",
            },
          };
        }

        return { ...p, recurrence: { ...p.recurrence, recurrence: 1 } };
      });
    },
    [isRecurrenceLocked, setFormData]
  );

  const handleInstallmentsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isRecurrenceLocked) return;
      setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, installments: e.target.value } }));
    },
    [isRecurrenceLocked, setFormData]
  );

  const selectedPeriod = useMemo(
    () => periodOptions.filter((opt) => opt.value === formData.recurrence.periods),
    [periodOptions, formData.recurrence.periods]
  );

  const handlePeriodChange = useCallback(
    (v: PeriodOption[]) => {
      if (isRecurrenceLocked) return;
      setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, periods: v[0]?.value ?? 1 } }));
    },
    [isRecurrenceLocked, setFormData]
  );

  const weekendOptions = useMemo<WeekendOption[]>(
    () => [
      { id: 1, label: t("entriesModal:recurrence.postpone"), value: 1 },
      { id: -1, label: t("entriesModal:recurrence.antedate"), value: -1 },
    ],
    [t]
  );

  const selectedWeekend = useMemo<WeekendOption[]>(
    () => (formData.recurrence.weekend ? weekendOptions.filter((o) => o.value === formData.recurrence.weekend) : []),
    [formData.recurrence.weekend, weekendOptions]
  );

  const handleWeekendChange = useCallback(
    (v: WeekendOption[]) => {
      if (isRecurrenceLocked) return;
      const next = v[0]?.value;
      setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, weekend: next ?? "" } }));
    },
    [isRecurrenceLocked, setFormData]
  );

  const isRecurring = formData.recurrence.recurrence === 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectDropdown<RecurrenceOption>
        label={t("entriesModal:recurrence.title")}
        items={recurrenceOptions}
        selected={selectedRecurrence}
        onChange={handleRecurrenceChange}
        getItemKey={(i) => i.id}
        getItemLabel={(i) => i.label}
        buttonLabel={t("entriesModal:misc.select")}
        singleSelect
        hideFilter
        customStyles={{ maxHeight: "140px" }}
        disabled={isRecurrenceLocked}
      />

      {isRecurring && (
        <>
          <Input
            id={installmentsInputId}
            label={t("entriesModal:recurrence.installments")}
            type="number"
            min={1}
            step={1}
            value={formData.recurrence.installments}
            onChange={handleInstallmentsChange}
            disabled={isRecurrenceLocked}
          />

          <SelectDropdown<PeriodOption>
            label={t("entriesModal:recurrence.periods")}
            items={periodOptions}
            selected={selectedPeriod}
            onChange={handlePeriodChange}
            getItemKey={(i) => i.id}
            getItemLabel={(i) => i.label}
            buttonLabel={t("entriesModal:recurrence.periodsBtn")}
            singleSelect
            customStyles={{ maxHeight: "140px" }}
            hideFilter
            disabled={isRecurrenceLocked}
          />

          <SelectDropdown<WeekendOption>
            label={t("entriesModal:recurrence.weekend")}
            items={weekendOptions}
            selected={selectedWeekend}
            onChange={handleWeekendChange}
            getItemKey={(i) => i.id}
            getItemLabel={(i) => i.label}
            buttonLabel={t("entriesModal:misc.select")}
            singleSelect
            customStyles={{ maxHeight: "140px" }}
            hideFilter
            disabled={isRecurrenceLocked}
          />
        </>
      )}
    </div>
  );
};

export default RecurrenceTab;

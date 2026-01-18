// src/components/Modal/Tab.recurrence.tsx

import React from "react";
import type { TFunction } from "i18next";

import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import type { FormData, PeriodOption, RecurrenceOption } from "../Modal.types";

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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectDropdown<RecurrenceOption>
        label={t("entriesModal:recurrence.title")}
        items={[
          { id: 1, label: t("entriesModal:recurrence.yes"), value: 1 },
          { id: 2, label: t("entriesModal:recurrence.no"), value: 0 },
        ]}
        selected={
          formData.recurrence.recurrence === 1
            ? [{ id: 1, label: t("entriesModal:recurrence.yes"), value: 1 }]
            : [{ id: 2, label: t("entriesModal:recurrence.no"), value: 0 }]
        }
        onChange={(v) =>
          setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, recurrence: v[0]?.value ?? 0 } }))
        }
        getItemKey={(i) => i.id}
        getItemLabel={(i) => i.label}
        buttonLabel={t("entriesModal:misc.select")}
        singleSelect
        hideFilter
        customStyles={{ maxHeight: "140px" }}
        disabled={isRecurrenceLocked}
      />

      {formData.recurrence.recurrence === 1 && (
        <>
          <Input
            id={installmentsInputId}
            label={t("entriesModal:recurrence.installments")}
            type="number"
            value={formData.recurrence.installments}
            onChange={(e) =>
              setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, installments: e.target.value } }))
            }
            disabled={isRecurrenceLocked}
          />

          <SelectDropdown<PeriodOption>
            label={t("entriesModal:recurrence.periods")}
            items={periodOptions}
            selected={periodOptions.filter((opt) => opt.value === formData.recurrence.periods)}
            onChange={(v) =>
              setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, periods: v[0]?.value ?? 1 } }))
            }
            getItemKey={(i) => i.id}
            getItemLabel={(i) => i.label}
            buttonLabel={t("entriesModal:recurrence.periodsBtn")}
            singleSelect
            customStyles={{ maxHeight: "140px" }}
            hideFilter
            disabled={isRecurrenceLocked}
          />

          <SelectDropdown<{ id: number; label: string; value: string }>
            label={t("entriesModal:recurrence.weekend")}
            items={[
              { id: 1, label: t("entriesModal:recurrence.postpone"), value: "postpone" },
              { id: -1, label: t("entriesModal:recurrence.antedate"), value: "antedate" },
            ]}
            selected={
              formData.recurrence.weekend
                ? [
                    formData.recurrence.weekend === "postpone"
                      ? { id: 1, label: t("entriesModal:recurrence.postpone"), value: "postpone" }
                      : { id: -1, label: t("entriesModal:recurrence.antedate"), value: "antedate" },
                  ]
                : []
            }
            onChange={(v) =>
              setFormData((p) => ({ ...p, recurrence: { ...p.recurrence, weekend: v[0]?.value || "" } }))
            }
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

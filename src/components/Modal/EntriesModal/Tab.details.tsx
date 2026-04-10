import React, { useCallback, useMemo } from "react";
import type { TFunction } from "i18next";

import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import EntryAccountingStatusCell from "@/components/CashFlowAccounting/EntryAccountingStatusCell";

import type { FormData } from "../Modal.types";
import type { AccountingReadiness } from "@/models/entries/accountingReadiness";
import type { CashflowCategory } from "@/models/settings/categories";
import type { DocumentType } from "src/models/entries/documentTypes";

type DocumentTypeItem = { id: DocumentType["code"]; label: string };

type Props = {
  t: TFunction;

  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;

  amountRef: React.RefObject<HTMLInputElement>;
  descriptionRef: React.RefObject<HTMLInputElement>;

  cashflowCategories: CashflowCategory[];
  categoryWrapId: string;

  documentTypes: DocumentTypeItem[];

  isFinancialLocked: boolean;
  accounting?: AccountingReadiness | null;
  onOpenAccountingReason?: () => void;
};

const DetailsTab: React.FC<Props> = ({
  t,
  formData,
  setFormData,
  amountRef,
  descriptionRef,
  cashflowCategories,
  categoryWrapId,
  documentTypes,
  isFinancialLocked,
  accounting,
  onOpenAccountingReason,
}) => {
  const selectedCategories = useMemo(() => {
    const id = String((formData.details as Record<string, unknown>).cashflowCategory || "");
    if (!id) return [];
    const found = cashflowCategories.find((a) => String(a.id) === id);
    return found ? [found] : [];
  }, [cashflowCategories, formData.details]);

  const handleCategoryChange = useCallback(
    (updated: CashflowCategory[]) => {
      if (isFinancialLocked) return;
      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({
        ...p,
        details: { ...p.details, cashflowCategory: id },
      }));
    },
    [isFinancialLocked, setFormData]
  );

  const selectedDocumentTypes = useMemo(() => {
    const id = String(formData.details.documentType || "");
    if (!id) return [];

    const found = documentTypes.find((d) => String(d.id) === id);
    if (found) return [found];

    return [
      {
        id: id as DocumentType["code"],
        label: t(`entriesModal:documentTypes.${id}`, { defaultValue: id }),
      },
    ];
  }, [documentTypes, formData.details.documentType, t]);

  const handleDocumentTypeChange = useCallback(
    (updated: DocumentTypeItem[]) => {
      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({ ...p, details: { ...p.details, documentType: id } }));
    },
    [setFormData]
  );

  const handleDueDateChange = useCallback(
    (valueIso: string) => {
      setFormData((p) => ({ ...p, details: { ...p.details, dueDate: valueIso } }));
    },
    [setFormData]
  );

  const handleAmountChange = useCallback(
    (next: string) => {
      if (isFinancialLocked) return;
      setFormData((p) => ({ ...p, details: { ...p.details, amount: next } }));
    },
    [isFinancialLocked, setFormData]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((p) => ({ ...p, details: { ...p.details, description: e.target.value } }));
    },
    [setFormData]
  );

  const handleObservationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((p) => ({ ...p, details: { ...p.details, observation: e.target.value } }));
    },
    [setFormData]
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((p) => ({ ...p, details: { ...p.details, notes: e.target.value } }));
    },
    [setFormData]
  );

  const getCategoryLabel = useCallback(
    (i: CashflowCategory) => (i.code ? `${i.code} — ${i.name}` : i.name || "—"),
    []
  );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Input
        kind="date"
        label={t("entriesModal:details.dueDate")}
        value={formData.details.dueDate}
        onValueChange={handleDueDateChange}
      />

      <Input
        kind="amount"
        ref={amountRef}
        id="amount-input"
        label={t("entriesModal:details.amount")}
        value={formData.details.amount}
        onValueChange={handleAmountChange}
        disabled={isFinancialLocked}
        zeroAsEmpty
      />

      <div id={categoryWrapId} className="space-y-1.5">
        <SelectDropdown<CashflowCategory>
          label={t("entriesModal:details.cashflowCategory", { defaultValue: "Category" })}
          items={cashflowCategories}
          selected={selectedCategories}
          onChange={handleCategoryChange}
          getItemKey={(i) => i.id}
          getItemLabel={getCategoryLabel}
          buttonLabel={t("entriesModal:details.cashflowCategoryBtn", { defaultValue: "Choose category" })}
          singleSelect
          customStyles={{ maxHeight: "220px" }}
          virtualize
          virtualRowHeight={32}
          virtualThreshold={300}
          disabled={isFinancialLocked}
        />

        {accounting ? (
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-[10px] text-gray-500">
              {t("entriesModal:details.accountingStatus", { defaultValue: "Accounting" })}
            </span>
            <EntryAccountingStatusCell accounting={accounting} onOpen={onOpenAccountingReason} />
          </div>
        ) : null}
      </div>

      <div className="md:col-span-3">
        <Input
          label={t("entriesModal:details.description")}
          ref={descriptionRef}
          type="text"
          placeholder={t("entriesModal:details.descriptionPlaceholder")}
          value={formData.details.description}
          onChange={handleDescriptionChange}
        />
      </div>

      <SelectDropdown<DocumentTypeItem>
        label={t("entriesModal:details.docType")}
        items={documentTypes}
        selected={selectedDocumentTypes}
        onChange={handleDocumentTypeChange}
        getItemKey={(i) => i.id}
        getItemLabel={(i) => i.label}
        buttonLabel={t("entriesModal:details.docTypeBtn")}
        singleSelect
        customStyles={{ maxHeight: "180px" }}
      />

      <div className="md:col-span-2">
        <Input
          label={t("entriesModal:details.observation")}
          type="text"
          placeholder={t("entriesModal:details.optional")}
          value={formData.details.observation}
          onChange={handleObservationChange}
        />
      </div>

      <div className="hidden md:block" />

      <div className="md:col-span-3">
        <Input
          label={t("entriesModal:details.notes")}
          placeholder={t("entriesModal:details.notesPlaceholder")}
          value={formData.details.notes}
          onChange={handleNotesChange}
        />
      </div>
    </div>
  );
};

export default DetailsTab;

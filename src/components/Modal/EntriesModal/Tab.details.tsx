// src/components/Modal/Tab.details.tsx

import React, { useCallback, useMemo } from "react";
import type { TFunction } from "i18next";

import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import type { FormData } from "../Modal.types";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { DocumentType } from "src/models/entries/documentTypes";

type DocumentTypeItem = { id: DocumentType["code"]; label: string };

type Props = {
  t: TFunction;

  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;

  amountRef: React.RefObject<HTMLInputElement>;
  descriptionRef: React.RefObject<HTMLInputElement>;

  ledgerAccounts: LedgerAccount[];
  ledgerWrapId: string;

  documentTypes: DocumentTypeItem[];

  isFinancialLocked: boolean;
};

const DetailsTab: React.FC<Props> = ({
  t,
  formData,
  setFormData,
  amountRef,
  descriptionRef,
  ledgerAccounts,
  ledgerWrapId,
  documentTypes,
  isFinancialLocked,
}) => {
  const selectedLedgerAccounts = useMemo(() => {
    const id = String(formData.details.ledgerAccount || "");
    if (!id) return [];
    const found = ledgerAccounts.find((a) => String(a.id) === id);
    return found ? [found] : [];
  }, [ledgerAccounts, formData.details.ledgerAccount]);

  const handleLedgerAccountChange = useCallback(
    (updated: LedgerAccount[]) => {
      if (isFinancialLocked) return;
      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({ ...p, details: { ...p.details, ledgerAccount: id } }));
    },
    [isFinancialLocked, setFormData]
  );

  const selectedDocumentTypes = useMemo(() => {
    const id = String(formData.details.documentType || "");
    if (!id) return [];

    const found = documentTypes.find((d) => String(d.id) === id);
    if (found) return [found];

    // fallback (e.g. async load or missing list item)
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

      <div id={ledgerWrapId}>
        <SelectDropdown<LedgerAccount>
          label={t("entriesModal:details.ledgerAccount")}
          items={ledgerAccounts}
          selected={selectedLedgerAccounts}
          onChange={handleLedgerAccountChange}
          getItemKey={(i) => i.id}
          getItemLabel={(i) => (i.code ? `${i.code} — ${i.account}` : i.account)}
          buttonLabel={t("entriesModal:details.ledgerAccountBtn")}
          singleSelect
          customStyles={{ maxHeight: "200px" }}
          groupBy={(i) =>
            i.subcategory ? `${i.category} / ${i.subcategory}` : i.category || t("entriesModal:misc.others")
          }
          virtualize
          virtualRowHeight={32}
          virtualThreshold={300}
          disabled={isFinancialLocked}
        />
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

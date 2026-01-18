// src/components/Modal/Tab.details.tsx

import React from "react";
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
  selectedLedgerAccounts: LedgerAccount[];
  onLedgerAccountChange: (updated: LedgerAccount[]) => void;
  ledgerWrapId: string;

  documentTypes: DocumentTypeItem[];
  selectedDocumentTypes: DocumentTypeItem[];
  onDocumentTypeChange: (updated: DocumentTypeItem[]) => void;

  isFinancialLocked: boolean;
};

const DetailsTab: React.FC<Props> = ({
  t,
  formData,
  setFormData,
  amountRef,
  descriptionRef,
  ledgerAccounts,
  selectedLedgerAccounts,
  onLedgerAccountChange,
  ledgerWrapId,
  documentTypes,
  selectedDocumentTypes,
  onDocumentTypeChange,
  isFinancialLocked,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Input
        kind="date"
        label={t("entriesModal:details.dueDate")}
        value={formData.details.dueDate}
        onValueChange={(valueIso) =>
          setFormData((p) => ({ ...p, details: { ...p.details, dueDate: valueIso } }))
        }
      />

      <Input
        kind="amount"
        ref={amountRef}
        id="amount-input"
        label={t("entriesModal:details.amount")}
        value={formData.details.amount}
        onValueChange={(next) =>
          setFormData((p) => ({ ...p, details: { ...p.details, amount: next } }))
        }
        disabled={isFinancialLocked}
        zeroAsEmpty
      />

      <div id={ledgerWrapId}>
        <SelectDropdown<LedgerAccount>
          label={t("entriesModal:details.ledgerAccount")}
          items={ledgerAccounts}
          selected={selectedLedgerAccounts}
          onChange={onLedgerAccountChange}
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
          onChange={(e) =>
            setFormData((p) => ({ ...p, details: { ...p.details, description: e.target.value } }))
          }
        />
      </div>

      <SelectDropdown<DocumentTypeItem>
        label={t("entriesModal:details.docType")}
        items={documentTypes}
        selected={selectedDocumentTypes}
        onChange={onDocumentTypeChange}
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
          onChange={(e) =>
            setFormData((p) => ({ ...p, details: { ...p.details, observation: e.target.value } }))
          }
        />
      </div>

      <div className="hidden md:block" />

      <div className="md:col-span-3">
        <Input
          label={t("entriesModal:details.notes")}
          placeholder={t("entriesModal:details.notesPlaceholder")}
          value={formData.details.notes}
          onChange={(e) =>
            setFormData((p) => ({ ...p, details: { ...p.details, notes: e.target.value } }))
          }
        />
      </div>
    </div>
  );
};

export default DetailsTab;

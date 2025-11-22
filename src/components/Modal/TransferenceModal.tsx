// src/components/Modal/TransferenceModal.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { api } from "src/api/requests";
import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import { formatCurrency, handleAmountKeyDown } from "src/lib";
import type { BankAccount } from "@/models/enterprise_structure/domain";

interface TransferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

type FormState = {
  date: string;          // ISO (YYYY-MM-DD)
  amount: string;        // string usada no input (R$)
  source_bank: string;   // external_id do banco origem
  dest_bank: string;     // external_id do banco destino
  description: string;   // observação/opcional
};

const initialForm: FormState = {
  date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  source_bank: "",
  dest_bank: "",
  description: "",
};

const TransferenceModal: React.FC<TransferenceModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation("transferenceModal");

  const [formData, setFormData] = useState<FormState>(initialForm);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => setFormData(initialForm), []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // atalhos + focus + scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const formEl = document.getElementById("transferenceForm") as HTMLFormElement | null;
        formEl?.requestSubmit();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => amountRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // carrega bancos (usa somente ativos)
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const { data } = await api.getBanks(true);
        const page = (data?.results ?? []) as BankAccount[];
        setBanks(page);
      } catch (err) {
        console.error("Erro ao buscar bancos:", err);
      }
    })();
  }, [isOpen]);

  // helpers de UI
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBankChange = (field: "source_bank" | "dest_bank", selected: BankAccount[]) => {
    const id = selected[0]?.id ?? "";
    setFormData((prev) => ({ ...prev, [field]: id }));
  };

  const swapBanks = () =>
    setFormData((prev) => ({ ...prev, source_bank: prev.dest_bank, dest_bank: prev.source_bank }));

  const bankOutOptions = useMemo(
    () =>
      banks
        .filter((b) => b.id !== formData.dest_bank)
        .slice()
        .sort((a, b) => a.institution.localeCompare(b.institution)),
    [banks, formData.dest_bank]
  );

  const bankInOptions = useMemo(
    () =>
      banks
        .filter((b) => b.id !== formData.source_bank)
        .slice()
        .sort((a, b) => a.institution.localeCompare(b.institution)),
    [banks, formData.source_bank]
  );

  const amountCents = useMemo(
    () => parseInt((formData.amount || "").replace(/\D/g, ""), 10) || 0,
    [formData.amount]
  );

  // label nas opções (somente institution + account_number)
  const optionLabelFor = (b?: BankAccount) =>
    b ? `${b.institution} • ${b.account_number}` : "";

  // label mais completo apenas no rodapé
  const footerLabelFor = useCallback(
    (b?: BankAccount) =>
      b
        ? `${b.institution} • ${t("labels.agency")} ${b.branch} • ${t("labels.account")} ${b.account_number}`
        : "",
    [t]
  );

  const bankOutLabel = useMemo(
    () => footerLabelFor(banks.find((b) => b.id === formData.source_bank)),
    [banks, formData.source_bank, footerLabelFor]
  );

  const bankInLabel = useMemo(
    () => footerLabelFor(banks.find((b) => b.id === formData.dest_bank)),
    [banks, formData.dest_bank, footerLabelFor]
  );

  const isValid =
    amountCents > 0 &&
    !!formData.date &&
    !!formData.source_bank &&
    !!formData.dest_bank &&
    formData.source_bank !== formData.dest_bank;

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        amount: (amountCents / 100).toFixed(2), // "3000.00"
        date: formData.date,                    // "YYYY-MM-DD"
        description: formData.description || "",
        source_bank: formData.source_bank,
        dest_bank: formData.dest_bank,
      };

      await api.addTransference(payload);

      resetForm();
      onSave();
    } catch (err) {
      console.error("Erro ao salvar transferência:", err);
      window.alert(t("errors.save"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("aria.dialog")}
        className="bg-white border border-gray-200 rounded-lg shadow-xl w-[720px] max-w-[95vw] h-[450px] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                TR
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.kind")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.title")}</h1>
              </div>
            </div>
            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
              onClick={handleClose}
              aria-label={t("actions.close")}
              title={t("actions.close")}
            >
              &times;
            </button>
          </div>
        </header>

        {/* Body */}
        <form id="transferenceForm" onSubmit={handleSubmit} className="relative z-10 px-5 py-4 overflow-visible flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Data / Valor / Observação */}
            <Input
              label={t("fields.date")}
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
            />

            <Input
              ref={amountRef}
              label={t("fields.amount")}
              name="amount"
              type="text"
              placeholder={t("placeholders.amount")}
              value={formatCurrency(formData.amount)}
              onKeyDown={(e) => handleAmountKeyDown(e, formData.amount, setFormData, true)}
              aria-label={t("fields.amount")}
            />

            <Input
              label={t("fields.note")}
              name="description"
              placeholder={t("placeholders.note")}
              value={formData.description}
              onChange={handleChange}
            />

            {/* Banco de saída / trocar / Banco de entrada */}
            <SelectDropdown<BankAccount>
              label={t("fields.bankOut")}
              items={bankOutOptions}
              selected={formData.source_bank ? bankOutOptions.filter((b) => b.id === formData.source_bank) : []}
              onChange={(sel) => handleBankChange("source_bank", sel)}
              getItemKey={(b) => b.id}
              getItemLabel={optionLabelFor}
              singleSelect
              buttonLabel={t("placeholders.selectBank")}
              customStyles={{ maxHeight: "180px" }}
            />

            <div className="flex items-end justify-center">
              <Button
                type="button"
                variant="outline"
                className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                onClick={swapBanks}
                disabled={!formData.source_bank && !formData.dest_bank}
                title={t("actions.swap")}
                aria-label={t("actions.swap")}
              >
                ⇄
              </Button>
            </div>

            <SelectDropdown<BankAccount>
              label={t("fields.bankIn")}
              items={bankInOptions}
              selected={formData.dest_bank ? bankInOptions.filter((b) => b.id === formData.dest_bank) : []}
              onChange={(sel) => handleBankChange("dest_bank", sel)}
              getItemKey={(b) => b.id}
              getItemLabel={optionLabelFor}
              singleSelect
              buttonLabel={t("placeholders.selectBank")}
              customStyles={{ maxHeight: "180px" }}
            />

            {formData.source_bank && formData.dest_bank && formData.source_bank === formData.dest_bank && (
              <p className="md:col-span-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {t("warnings.sameBank")}
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
          <div className="text-[12px] text-gray-600">
            {amountCents > 0 ? (
              <>
                <b>{formatCurrency(formData.amount)}</b>
                {bankOutLabel || bankInLabel ? (
                  <>
                    {" "}
                    — {bankOutLabel ? <>{t("labels.from")} <b>{bankOutLabel}</b></> : null}
                    {bankInLabel ? <> {t("labels.to")} <b>{bankInLabel}</b></> : null}
                  </>
                ) : null}
              </>
            ) : (
              <>{t("hints.fillToSave")}</>
            )}
            <span className="ml-3 text-gray-400">{t("hints.shortcuts")}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="cancel" type="button" onClick={handleClose}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" form="transferenceForm" disabled={!isValid || isSubmitting}>
              {isSubmitting ? t("actions.saving") : t("actions.save")}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TransferenceModal;

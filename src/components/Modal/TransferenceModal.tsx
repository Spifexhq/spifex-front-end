// src/components/Modal/TransferenceModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { api } from "src/api/requests";
import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import { formatCurrency } from "src/lib";
import type { BankAccount } from "@/models/enterprise_structure/domain";
import { DateInput } from "../ui/DateInput";
import AmountInput from "../ui/AmountInput/AmountInput";

interface TransferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

type FormState = {
  date: string; // ISO (YYYY-MM-DD)
  amount: string; // major decimal string: "1234.56"
  source_bank: string; // external_id
  dest_bank: string; // external_id
  description: string;
};

const buildInitialForm = (): FormState => ({
  date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  source_bank: "",
  dest_bank: "",
  description: "",
});

const sortBanksByInstitution = (items: BankAccount[]) =>
  [...items].sort((a, b) => a.institution.localeCompare(b.institution));

type TranslateFn = (key: string) => string;

const getBankFooterLabel = (t: TranslateFn, b?: BankAccount) =>
  b ? `${b.institution} • ${t("labels.agency")} ${b.branch} • ${t("labels.account")} ${b.account_number}` : "";

const TransferenceModal: React.FC<TransferenceModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation("transferenceModal");

  const [formData, setFormData] = useState<FormState>(() => buildInitialForm());
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const resetForm = useCallback(() => setFormData(buildInitialForm()), []);
  const closeModal = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ---------- Derived state ----------
  const sortedBanks = useMemo(() => sortBanksByInstitution(banks), [banks]);

  const selectedOut = useMemo(
    () => banks.find((b) => b.id === formData.source_bank),
    [banks, formData.source_bank]
  );
  const selectedIn = useMemo(
    () => banks.find((b) => b.id === formData.dest_bank),
    [banks, formData.dest_bank]
  );

  const bankOutOptions = useMemo(
    () => sortedBanks.filter((b) => b.id !== formData.dest_bank),
    [sortedBanks, formData.dest_bank]
  );
  const bankInOptions = useMemo(
    () => sortedBanks.filter((b) => b.id !== formData.source_bank),
    [sortedBanks, formData.source_bank]
  );

  const amountMajorNumber = useMemo(() => {
    const n = Number(formData.amount);
    return Number.isFinite(n) ? n : 0;
  }, [formData.amount]);

  const isValid = useMemo(() => {
    return (
      amountMajorNumber > 0 &&
      !!formData.date &&
      !!formData.source_bank &&
      !!formData.dest_bank &&
      formData.source_bank !== formData.dest_bank
    );
  }, [amountMajorNumber, formData.date, formData.source_bank, formData.dest_bank]);

  const showSameBankWarning =
    !!formData.source_bank && !!formData.dest_bank && formData.source_bank === formData.dest_bank;

  const tKey = useCallback((key: string) => String(t(key)), [t]);

  const bankOutFooterLabel = useMemo(
    () => getBankFooterLabel(tKey, selectedOut),
    [tKey, selectedOut]
  );

  const bankInFooterLabel = useMemo(
    () => getBankFooterLabel(tKey, selectedIn),
    [tKey, selectedIn]
  );

  // ---------- Effects ----------
  // lock scroll + shortcuts while open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    // focus after paint
    requestAnimationFrame(() => amountRef.current?.focus());

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeModal]);

  // load banks when opening
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;
    (async () => {
      try {
        const { data } = await api.getBanks(true);
        const page = (data?.results ?? []) as BankAccount[];
        if (alive) setBanks(page);
      } catch (err) {
        console.error("Erro ao buscar bancos:", err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen]);

  // ---------- Handlers ----------
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      if (name === "description") setField("description", value);
    },
    [setField]
  );

  const handleBankChange = useCallback(
    (field: "source_bank" | "dest_bank", selected: BankAccount[]) => {
      // IMPORTANT: your BankAccount domain uses `id` as the external_id in the UI layer.
      // (Keeping consistent with the rest of your app + current modal usage.)
      const id = selected[0]?.id ?? "";
      setField(field, id);
    },
    [setField]
  );

  const swapBanks = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      source_bank: prev.dest_bank,
      dest_bank: prev.source_bank,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await api.addTransference({
          amount: formData.amount, // major decimal string
          date: formData.date,
          description: formData.description || "",
          source_bank: formData.source_bank,
          dest_bank: formData.dest_bank,
        });

        resetForm();
        onSave();
      } catch (err) {
        console.error("Erro ao salvar transferência:", err);
        window.alert(t("errors.save"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, isSubmitting, isValid, onSave, resetForm, t]
  );

  // ---------- Render ----------
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("aria.dialog")}
        className="bg-white border border-gray-200 rounded-lg shadow-xl w-[720px] max-w-[95vw] h-[450px] max-h-[90vh] overflow-hidden flex flex-col"
      >
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
              onClick={closeModal}
              aria-label={t("actions.close")}
              title={t("actions.close")}
              type="button"
            >
              &times;
            </button>
          </div>
        </header>

        {/* IMPORTANT: footer must be inside the form so the submit button works */}
        <form ref={formRef} onSubmit={handleSubmit} className="relative z-10 flex-1 flex flex-col">
          <div className="px-5 py-4 overflow-visible">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <DateInput
                label={t("fields.date")}
                value={formData.date}
                onChange={(iso) => setField("date", iso)}
              />

              <AmountInput
                ref={amountRef}
                label={t("fields.amount")}
                id="amount-input"
                value={formData.amount}
                onValueChange={(next) => setField("amount", next)}
                aria-label={t("fields.amount")}
                zeroAsEmpty
              />

              <Input
                label={t("fields.note")}
                name="description"
                placeholder={t("placeholders.note")}
                value={formData.description}
                onChange={handleTextChange}
              />

              <SelectDropdown<BankAccount>
                label={t("fields.bankOut")}
                items={bankOutOptions}
                selected={
                  formData.source_bank
                    ? bankOutOptions.filter((b) => b.id === formData.source_bank)
                    : []
                }
                onChange={(sel) => handleBankChange("source_bank", sel)}
                getItemKey={(b) => b.id}
                getItemLabel={(b) => (b ? `${b.institution} • ${b.account_number}` : "")}
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
                getItemLabel={(b) => (b ? `${b.institution} • ${b.account_number}` : "")}
                singleSelect
                buttonLabel={t("placeholders.selectBank")}
                customStyles={{ maxHeight: "180px" }}
              />

              {showSameBankWarning && (
                <p className="md:col-span-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {t("warnings.sameBank")}
                </p>
              )}
            </div>
          </div>

          {/* Keep the exact same footer design, but inside the form */}
          <footer className="mt-auto border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <div className="text-[12px] text-gray-600">
              {amountMajorNumber > 0 ? (
                <>
                  <b>{formatCurrency(formData.amount)}</b>
                  {bankOutFooterLabel || bankInFooterLabel ? (
                    <>
                      {" "}
                      —{" "}
                      {bankOutFooterLabel ? (
                        <>
                          {t("labels.from")} <b>{bankOutFooterLabel}</b>
                        </>
                      ) : null}
                      {bankInFooterLabel ? (
                        <>
                          {" "}
                          {t("labels.to")} <b>{bankInFooterLabel}</b>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <>{t("hints.fillToSave")}</>
              )}
              <span className="ml-3 text-gray-400">{t("hints.shortcuts")}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={closeModal}>
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? t("actions.saving") : t("actions.save")}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default TransferenceModal;

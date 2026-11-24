import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight } from "lucide-react";
import FloatingDialog, { DialogSkeleton } from "@/components/Modal/FloatingDialog";
import { fetchAllCursor } from "@/lib/list";

import { api } from "@/core/api/requests";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import { Select } from "src/shared/ui/Select";
import { formatCurrency } from "@/lib";

import type { BankAccount } from "@/models/settings/banking";
import type { CashflowCategory } from "@/models/settings/categories";

interface TransferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

type FormState = {
  date: string;
  amount: string;
  source_bank: string;
  dest_bank: string;
  description: string;
  destination_amount: string;
  exchange_rate: string;
  fee: string;
  fee_category: string;
};

const buildInitialForm = (): FormState => ({
  date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  source_bank: "",
  dest_bank: "",
  description: "",
  destination_amount: "",
  exchange_rate: "",
  fee: "",
  fee_category: "",
});

const sortBanksByInstitution = (items: BankAccount[]) =>
  [...items].sort((a, b) => a.institution.localeCompare(b.institution));

type TranslateFn = (key: string) => string;

const getBankFooterLabel = (t: TranslateFn, b?: BankAccount) =>
  b ? `${b.institution} • ${t("labels.agency")} ${b.branch} • ${t("labels.account")} ${b.account_number}` : "";

function normalizeComparable(raw: FormState) {
  const trim = (v: string) => (v ?? "").trim();
  return {
    date: trim(raw.date),
    amount: trim(raw.amount),
    source_bank: trim(raw.source_bank),
    dest_bank: trim(raw.dest_bank),
    description: trim(raw.description),
    destination_amount: trim(raw.destination_amount),
    exchange_rate: trim(raw.exchange_rate),
    fee: trim(raw.fee),
    fee_category: trim(raw.fee_category),
  };
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function isDropdownOpen() {
  return !!document.querySelector('[data-select-open="true"]');
}

const TransferenceModal: React.FC<TransferenceModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation("transferenceModal");

  const [formData, setFormData] = useState<FormState>(() => buildInitialForm());
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [banksError, setBanksError] = useState(false);
  const [bankAttempt, setBankAttempt] = useState(0);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [feeCategories, setFeeCategories] = useState<CashflowCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const initialRef = useRef<FormState>(buildInitialForm());

  const resetForm = useCallback(() => {
    const next = buildInitialForm();
    initialRef.current = next;
    setFormData(next);
    setShowCloseConfirm(false);
    setWarning(null);
    setIsSubmitting(false);
  }, []);

  const closeModal = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const sortedBanks = useMemo(() => sortBanksByInstitution(banks), [banks]);

  const selectedOut = useMemo(
    () => sortedBanks.find((b) => b.id === formData.source_bank),
    [sortedBanks, formData.source_bank]
  );
  const selectedIn = useMemo(
    () => sortedBanks.find((b) => b.id === formData.dest_bank),
    [sortedBanks, formData.dest_bank]
  );

  const bankOutOptions = useMemo(
    () => sortedBanks.filter((b) => b.id !== formData.dest_bank),
    [sortedBanks, formData.dest_bank]
  );
  const bankInOptions = useMemo(
    () => sortedBanks.filter((b) => b.id !== formData.source_bank),
    [sortedBanks, formData.source_bank]
  );

  const isCrossCurrency = Boolean(
    selectedOut?.currency &&
      selectedIn?.currency &&
      selectedOut.currency.toUpperCase() !== selectedIn.currency.toUpperCase()
  );
  const feeValue = Number(formData.fee || 0);

  const isValid = useMemo(() => {
    const hasAmount = formData.amount > "";
    const n = Number(formData.amount);
    const baseValid =
      hasAmount &&
      Number.isFinite(n) &&
      n > 0 &&
      !!formData.date &&
      !!formData.source_bank &&
      !!formData.dest_bank &&
      formData.source_bank !== formData.dest_bank;
    if (!baseValid) return false;
    if (isCrossCurrency && !formData.destination_amount && !formData.exchange_rate) {
      return false;
    }
    const fee = Number(formData.fee || 0);
    if (Number.isFinite(fee) && fee > 0 && !formData.fee_category) return false;
    if (formData.fee && (!Number.isFinite(fee) || fee < 0)) return false;
    return true;
  }, [
    formData.amount,
    formData.date,
    formData.source_bank,
    formData.dest_bank,
    formData.destination_amount,
    formData.exchange_rate,
    formData.fee,
    formData.fee_category,
    isCrossCurrency,
  ]);

  const isDirty = useMemo(() => {
    if (!isOpen) return false;
    return !shallowEqual(normalizeComparable(formData), normalizeComparable(initialRef.current));
  }, [formData, isOpen]);

  const showSameBankWarning =
    !!formData.source_bank && !!formData.dest_bank && formData.source_bank === formData.dest_bank;

  const tKey = useCallback((key: string) => String(t(key)), [t]);

  const bankOutFooterLabel = useMemo(() => getBankFooterLabel(tKey, selectedOut), [tKey, selectedOut]);
  const bankInFooterLabel = useMemo(() => getBankFooterLabel(tKey, selectedIn), [tKey, selectedIn]);

  const attemptClose = useCallback(() => {
    if (!isOpen) return;
    if (isSubmitting) return;
    if (isDropdownOpen()) return;

    if (warning) {
      setWarning(null);
      return;
    }

    if (showCloseConfirm) {
      setShowCloseConfirm(false);
      return;
    }

    if (isDirty) {
      setShowCloseConfirm(true);
      return;
    }

    closeModal();
  }, [isOpen, isSubmitting, warning, showCloseConfirm, isDirty, closeModal]);

  useEffect(() => {
    if (!isOpen) return;

    const next = buildInitialForm();
    initialRef.current = next;
    setFormData(next);
    setShowCloseConfirm(false);
    setWarning(null);
    setIsSubmitting(false);

    requestAnimationFrame(() => amountRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!warning && !showCloseConfirm && !loadingBanks) formRef.current?.requestSubmit();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, attemptClose, warning, showCloseConfirm, loadingBanks]);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;
    setLoadingBanks(true);
    setBanksError(false);
    fetchAllCursor<BankAccount>(api.getBanks).then(items => {
      if (alive) setBanks(items);
    }).catch(() => { if (alive) { setBanks([]); setBanksError(true); } }).finally(() => { if (alive) setLoadingBanks(false); });
    return () => { alive = false; };
  }, [isOpen, bankAttempt]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    api
      .getCashflowCategories({ is_active: "true", tx_type_hint: "debit" })
      .then((items) => {
        if (alive) setFeeCategories(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (alive) setFeeCategories([]);
      });
    return () => {
      alive = false;
    };
  }, [isOpen]);

  const handleBankChange = useCallback(
    (field: "source_bank" | "dest_bank", selected: BankAccount[]) => {
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
      if (!isValid || isSubmitting || loadingBanks || banksError) return;

      setIsSubmitting(true);
      try {
        await api.addTransference({
          amount: formData.amount,
          date: formData.date,
          description: formData.description || "",
          source_bank: formData.source_bank,
          dest_bank: formData.dest_bank,
          ...(isCrossCurrency
            ? {
                ...(formData.destination_amount
                  ? { destination_amount: formData.destination_amount }
                  : {}),
                ...(formData.exchange_rate
                  ? { exchange_rate: formData.exchange_rate }
                  : {}),
              }
            : {}),
          ...(Number(formData.fee || 0) > 0
            ? {
                fee: formData.fee,
                ...(formData.fee_category
                  ? { fee_category: formData.fee_category }
                  : {}),
              }
            : {}),
        });

        onSave();
        closeModal();
      } catch (err) {
        console.error(t("errors.save"), err);
        setWarning({
          title: t("errors.saveTitle", { defaultValue: "Save failed" }),
          message: t("errors.save"),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [closeModal, formData, isSubmitting, isValid, loadingBanks, banksError, onSave, t, isCrossCurrency]
  );

  return (
    <FloatingDialog isOpen={isOpen} width={720} height={590} title={t("header.title")} eyebrow={t("header.kind")} description={t("guidance.intro")} closeLabel={t("actions.close")} onClose={attemptClose} busy={isSubmitting} loading={loadingBanks} onSubmit={handleSubmit} formRef={formRef}
      footer={<>            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-gray-600 hidden md:block">
                {formData.amount > "" ? (
                  <>
                    {t("footer.value")} <b>{formatCurrency(formData.amount)}</b>
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
                <span className="ml-3 text-gray-500">{t("hints.shortcuts")}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:ml-auto">
                <Button variant="secondary" disabled={isSubmitting} type="button" onClick={attemptClose} className="w-full md:w-auto">
                  {t("actions.cancel")}
                </Button>
                <Button type="submit" disabled={!isValid || isSubmitting || loadingBanks || banksError} className="w-full md:w-auto">
                  {isSubmitting ? t("actions.saving") : t("actions.save")}
                </Button>
              </div>
            </div>
</>} overlay={(showCloseConfirm || warning) ? <>        {showCloseConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-gray-900">
                  {t("confirmDiscard.title", { defaultValue: "Discard changes?" })}
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  {t("confirmDiscard.message", {
                    defaultValue: "You have unsaved changes. Do you want to discard them?",
                  })}
                </p>
              </div>
              <div
                className="px-5 py-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button variant="secondary" className="w-full md:w-auto" onClick={() => setShowCloseConfirm(false)}>
                  {t("actions.back", { defaultValue: "Back" })}
                </Button>
                <Button variant="danger" className="w-full md:w-auto !bg-red-500 hover:!bg-red-600" onClick={closeModal}>
                  {t("actions.discard", { defaultValue: "Discard" })}
                </Button>
              </div>
            </div>
          </div>
        )}

        {warning && (
          <div className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h2 className="text-[15px] font-semibold text-amber-800">{warning.title}</h2>
                <p className="mt-1 text-xs text-amber-700">{warning.message}</p>
              </div>
              <div
                className="px-5 py-4 flex justify-end"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="primary"
                  className="w-full md:w-auto"
                  onClick={() => {
                    setWarning(null);
                    requestAnimationFrame(() => amountRef.current?.focus());
                  }}
                >
                  {t("actions.ok", { defaultValue: "OK" })}
                </Button>
              </div>
            </div>
          </div>
        )}
</> : undefined}
    >
      {loadingBanks ? <DialogSkeleton fields={5} label={t("guidance.loading")} /> : banksError ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>{t("errors.loadBanks")}</p><Button type="button" variant="secondary" className="mt-3" onClick={() => setBankAttempt(value => value + 1)}>{t("guidance.retry")}</Button></div> : <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                kind="date"
                label={t("fields.date")}
                value={formData.date}
                onValueChange={(iso: string) => setField("date", iso)}
              />

              <Input
                kind="amount"
                ref={amountRef}
                label={t("fields.amount")}
                id="amount-input"
                value={formData.amount}
                onValueChange={(next: string) => setField("amount", next)}
                currency={selectedOut?.currency}
                aria-label={t("fields.amount")}
                zeroAsEmpty
              />

              <div className="md:col-span-2">
              <Input
                kind="text"
                label={t("fields.note")}
                name="description"
                placeholder={t("placeholders.note")}
                value={formData.description}
                onChange={(e) => setField("description", e.target.value)}
              />
              </div>

              <Select<BankAccount>
                label={t("fields.bankOut")}
                items={bankOutOptions}
                selected={formData.source_bank ? bankOutOptions.filter((b) => b.id === formData.source_bank) : []}
                onChange={(sel) => handleBankChange("source_bank", sel)}
                getItemKey={(b) => b.id}
                getItemLabel={(b) => (b ? `${b.institution} • ${b.account_number}` : "")}
                singleSelect
                buttonLabel={t("placeholders.selectBank")}
                customStyles={{ maxHeight: "180px" }}
              />

              <div className="flex items-end justify-start md:col-span-2 md:order-last">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full md:w-auto !border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={swapBanks}
                  disabled={!formData.source_bank && !formData.dest_bank}
                  title={t("actions.swap")}
                  aria-label={t("actions.swap")}
                >
                  <ArrowLeftRight size={16} className="mr-2" aria-hidden="true" />{t("actions.swap")}
                </Button>
              </div>

              <Select<BankAccount>
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

              {isCrossCurrency && (
                <>
                  <Input
                    kind="amount"
                    label={t("fields.destinationAmount", { defaultValue: "Destination amount" })}
                    value={formData.destination_amount}
                    onValueChange={(next: string) => setField("destination_amount", next)}
                    currency={selectedIn?.currency}
                    zeroAsEmpty
                  />
                  <Input
                    kind="text"
                    label={t("fields.exchangeRate", { defaultValue: "Exchange rate" })}
                    value={formData.exchange_rate}
                    onChange={(e) => setField("exchange_rate", e.target.value)}
                    placeholder={t("placeholders.exchangeRate", { defaultValue: "Destination per source unit" })}
                  />
                </>
              )}

              <Input
                kind="amount"
                label={t("fields.fee", { defaultValue: "Fee (optional)" })}
                value={formData.fee}
                onValueChange={(next: string) => setField("fee", next)}
                currency={selectedOut?.currency}
                zeroAsEmpty
              />

              {feeValue > 0 && (
                <Select<CashflowCategory>
                  label={t("fields.feeCategory", { defaultValue: "Fee category" })}
                  items={feeCategories}
                  selected={feeCategories.filter((item) => item.id === formData.fee_category)}
                  onChange={(items) => setField("fee_category", items[0]?.id ?? "")}
                  getItemKey={(item) => item.id}
                  getItemLabel={(item) => (item.code ? `${item.code} — ${item.name}` : item.name)}
                  singleSelect
                  buttonLabel={t("placeholders.selectFeeCategory", { defaultValue: "Select fee category" })}
                  customStyles={{ maxHeight: "220px" }}
                />
              )}

              {showSameBankWarning && (
                <p className="md:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {t("warnings.sameBank")}
                </p>
              )}
            </div>
      </>}
    </FloatingDialog>
  );
};

export default TransferenceModal;

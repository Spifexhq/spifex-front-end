// src/components/Modal/TransferenceModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import { api } from "@/api/requests";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import { formatCurrency } from "@/lib";

import type { BankAccount } from "@/models/settings/banking";
import type { ApiError } from "@/models/Api";

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

function normalizeComparable(raw: FormState) {
  const trim = (v: string) => (v ?? "").trim();
  return {
    date: trim(raw.date),
    amount: trim(raw.amount),
    source_bank: trim(raw.source_bank),
    dest_bank: trim(raw.dest_bank),
    description: trim(raw.description),
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
  const [banks, setBanks] = useState<BankAccount[]>([]);
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

  const isValid = useMemo(() => {
    const hasAmount = formData.amount > "";
    const n = Number(formData.amount);

    return (
      hasAmount &&
      Number.isFinite(n) &&
      n > 0 &&
      !!formData.date &&
      !!formData.source_bank &&
      !!formData.dest_bank &&
      formData.source_bank !== formData.dest_bank
    );
  }, [formData.amount, formData.date, formData.source_bank, formData.dest_bank]);

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

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, attemptClose]);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      try {
        type ApiOk<T> = { data: T };
        type ApiResult<T> = ApiOk<T> | ApiError;

        const res = (await api.getBanks()) as ApiResult<{ results?: BankAccount[] }>;
        if (!("data" in res)) {
          console.error(t("errors.loadBanks"), res?.error);
          return;
        }

        const page = (res.data?.results ?? []) as BankAccount[];
        if (alive) setBanks(page);
      } catch (err) {
        console.error(t("errors.loadBanks"), err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, t]);

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
      if (!isValid || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await api.addTransference({
          amount: formData.amount,
          date: formData.date,
          description: formData.description || "",
          source_bank: formData.source_bank,
          dest_bank: formData.dest_bank,
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
    [closeModal, formData, isSubmitting, isValid, onSave, t]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 md:grid md:place-items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          attemptClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("aria.dialog")}
        onMouseDown={(event) => event.stopPropagation()}
        className={[
          "relative bg-white shadow-2xl flex flex-col w-full",
          "h-[100dvh] max-h-[100dvh] rounded-none border-0 fixed inset-x-0 bottom-0",
          "md:static md:w-[720px] md:max-w-[95vw] md:h-auto md:max-h-[calc(100vh-4rem)]",
          "md:rounded-lg md:border md:border-gray-200",
        ].join(" ")}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <header className="border-b border-gray-200 bg-white shrink-0">
          <div className="px-4 md:px-5 pt-2 md:pt-4 pb-3 md:pb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700 shrink-0">
                {t("header.badge")}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.kind")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.title")}</h1>
              </div>
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center shrink-0"
              onClick={attemptClose}
              aria-label={t("actions.close")}
              title={t("actions.close")}
              disabled={isSubmitting}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col md:block md:flex-none">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:block md:max-h-none md:overflow-visible md:px-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                aria-label={t("fields.amount")}
                zeroAsEmpty
              />

              <Input
                kind="text"
                label={t("fields.note")}
                name="description"
                placeholder={t("placeholders.note")}
                value={formData.description}
                onChange={(e) => setField("description", e.target.value)}
              />

              <SelectDropdown<BankAccount>
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

              <div className="flex items-end justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full md:w-auto !border-gray-200 !text-gray-700 hover:!bg-gray-50"
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

          <footer
            className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 md:px-5"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-[12px] text-gray-600 hidden md:block">
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
                <span className="ml-3 text-gray-400">{t("hints.shortcuts")}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:ml-auto">
                <Button variant="cancel" type="button" onClick={attemptClose} className="w-full md:w-auto">
                  {t("actions.cancel")}
                </Button>
                <Button type="submit" disabled={!isValid || isSubmitting} className="w-full md:w-auto">
                  {isSubmitting ? t("actions.saving") : t("actions.save")}
                </Button>
              </div>
            </div>
          </footer>
        </form>

        {showCloseConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-gray-900">
                  {t("confirmDiscard.title", { defaultValue: "Discard changes?" })}
                </h2>
                <p className="mt-1 text-[12px] text-gray-600">
                  {t("confirmDiscard.message", {
                    defaultValue: "You have unsaved changes. Do you want to discard them?",
                  })}
                </p>
              </div>
              <div
                className="px-5 py-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button variant="outline" className="w-full md:w-auto" onClick={() => setShowCloseConfirm(false)}>
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
                <p className="mt-1 text-[12px] text-amber-700">{warning.message}</p>
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
      </div>
    </div>
  );
};

export default TransferenceModal;
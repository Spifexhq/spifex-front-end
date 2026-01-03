/* -------------------------------------------------------------------------- */
/* File: src/pages/BankSettings/BankModal.tsx                                  */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "src/components/ui/Input";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { SelectDropdown } from "@/components/ui/SelectDropdown";

import { api } from "@/api/requests";

import type { BankAccount } from "@/models/settings/banking";

/* ----------------------------- Constants/Types ---------------------------- */

const ACCOUNT_TYPE_VALUES = ["checking", "savings", "investment", "cash"] as const;
type AccountType = (typeof ACCOUNT_TYPE_VALUES)[number];

type Mode = "create" | "edit";

type BankForm = {
  institution: string;
  account_type: AccountType;
  branch: string;
  account_number: string;
  iban: string;
  initial_balance: string; // MAJOR decimal string
  is_active: boolean;
};

function isAccountType(v: unknown): v is AccountType {
  return ACCOUNT_TYPE_VALUES.includes(v as AccountType);
}

function buildEmptyForm(): BankForm {
  return {
    institution: "",
    account_type: "checking",
    branch: "",
    account_number: "",
    iban: "",
    initial_balance: "0.00",
    is_active: true,
  };
}

function coerceMajorDecimalOrZero(v: unknown) {
  const s = String(v ?? "").trim();
  return s || "0.00";
}

function normalizeComparable(form: BankForm) {
  const trim = (v: string) => (v ?? "").trim();
  return {
    institution: trim(form.institution),
    account_type: isAccountType(form.account_type) ? form.account_type : "checking",
    branch: trim(form.branch),
    account_number: trim(form.account_number),
    iban: trim(form.iban),
    initial_balance: trim(form.initial_balance) || "0.00",
    is_active: !!form.is_active,
  };
}

const ModalSkeleton: React.FC = () => (
  <div className="space-y-3 py-1">
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="flex items-center gap-3 pt-2">
      <div className="h-5 w-5 rounded bg-gray-100 animate-pulse" />
      <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
    </div>
    <div className="flex justify-end gap-2 pt-1">
      <div className="h-9 w-24 rounded-md bg-gray-100 animate-pulse" />
      <div className="h-9 w-28 rounded-md bg-gray-100 animate-pulse" />
    </div>
  </div>
);

export type BankModalProps = {
  isOpen: boolean;
  mode: Mode;
  bank?: BankAccount | null;

  orgCurrency: string; // pinned by rule; display + payload uses this
  canEdit?: boolean;

  onClose: () => void;
  onNotify?: (snack: { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" } | null) => void;
  onSaved?: (result: { mode: Mode; created?: BankAccount; updatedId?: string }) => void;
};

const BankModal: React.FC<BankModalProps> = ({
  isOpen,
  mode,
  bank,
  orgCurrency,
  canEdit = true,
  onClose,
  onNotify,
  onSaved,
}) => {
  const { t } = useTranslation("bankSettings");

  const bankId = bank?.id ?? null;

  const [formData, setFormData] = useState<BankForm>(buildEmptyForm());
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);

  const baselineRef = useRef<string>(JSON.stringify(normalizeComparable(buildEmptyForm())));
  const institutionRef = useRef<HTMLInputElement>(null);

  const accountTypeOptions = useMemo(
    () =>
      ACCOUNT_TYPE_VALUES.map((value) => ({
        value,
        label: t(`accountType.${value}`),
      })),
    [t]
  );

  const title = mode === "create" ? t("modal.createTitle") : t("modal.editTitle");

  const isDirty = useMemo(() => {
    const now = JSON.stringify(normalizeComparable(formData));
    return now !== baselineRef.current;
  }, [formData]);

  const isSaveDisabled = useMemo(() => {
    if (!canEdit) return true;
    if (isSubmitting || isDetailLoading) return true;
    if (!formData.institution.trim()) return true;
    if (!isAccountType(formData.account_type)) return true;
    return false;
  }, [canEdit, isSubmitting, isDetailLoading, formData.institution, formData.account_type]);

  const hardReset = useCallback(() => {
    setFormData(buildEmptyForm());
    setIsDetailLoading(false);
    setIsSubmitting(false);
    setShowCloseConfirm(false);
    setWarning(null);
    baselineRef.current = JSON.stringify(normalizeComparable(buildEmptyForm()));
  }, []);

  const handleClose = useCallback(() => {
    hardReset();
    onClose();
  }, [hardReset, onClose]);

  const attemptClose = useCallback(() => {
    if (warning) {
      setWarning(null);
      return;
    }
    if (showCloseConfirm) return;

    if (isDirty) {
      setShowCloseConfirm(true);
      return;
    }

    handleClose();
  }, [warning, showCloseConfirm, isDirty, handleClose]);

  /* ------------------------------ load detail on open ------------------------------ */
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      hardReset();

      if (mode === "create") {
        setTimeout(() => institutionRef.current?.focus(), 80);
        return;
      }

      if (!bankId) return;

      setIsDetailLoading(true);
      try {
        const res = await api.getBank(bankId);
        const detail = res.data as BankAccount;
        if (!alive) return;

        const next: BankForm = {
          institution: detail.institution ?? "",
          account_type: isAccountType(detail.account_type) ? (detail.account_type as AccountType) : "checking",
          branch: detail.branch ?? "",
          account_number: detail.account_number ?? "",
          iban: detail.iban ?? "",
          initial_balance: coerceMajorDecimalOrZero(detail.initial_balance),
          is_active: detail.is_active ?? true,
        };

        setFormData(next);
        baselineRef.current = JSON.stringify(normalizeComparable(next));
        setTimeout(() => institutionRef.current?.focus(), 80);
      } catch {
        if (!alive) return;

        const fallback: BankForm = {
          institution: bank?.institution ?? "",
          account_type: isAccountType(bank?.account_type) ? (bank!.account_type as AccountType) : "checking",
          branch: bank?.branch ?? "",
          account_number: bank?.account_number ?? "",
          iban: bank?.iban ?? "",
          initial_balance: coerceMajorDecimalOrZero(bank?.initial_balance),
          is_active: bank?.is_active ?? true,
        };

        setFormData(fallback);
        baselineRef.current = JSON.stringify(normalizeComparable(fallback));
        onNotify?.({ message: t("errors.detailError"), severity: "error" });
        setTimeout(() => institutionRef.current?.focus(), 80);
      } finally {
        if (alive) setIsDetailLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, mode, bankId, bank, hardReset, onNotify, t]);

  /* ------------------------------ body scroll lock ------------------------------ */
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* ------------------------------ keyboard: ESC, Ctrl/⌘+S ------------------------------ */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        (document.getElementById("bankModalForm") as HTMLFormElement | null)?.requestSubmit();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canEdit) return;

      const institution = formData.institution.trim();
      if (!institution) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationInstitution") });
        return;
      }

      if (!isAccountType(formData.account_type)) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationAccountType") });
        return;
      }

      const payload = {
        institution,
        account_type: formData.account_type,
        currency: orgCurrency, // pinned by rule
        branch: (formData.branch ?? "").trim(),
        account_number: (formData.account_number ?? "").trim(),
        iban: (formData.iban ?? "").trim(),
        initial_balance: (formData.initial_balance ?? "").trim() || "0.00",
        is_active: !!formData.is_active,
      };

      setIsSubmitting(true);
      try {
        if (mode === "create") {
          const { data: created } = await api.addBank(payload);
          onNotify?.({ message: t("toast.saveOk"), severity: "success" });
          onSaved?.({ mode: "create", created: created as BankAccount });
          handleClose();
          return;
        }

        if (!bankId) return;

        await api.editBank(bankId, payload);
        onNotify?.({ message: t("toast.saveOk"), severity: "success" });
        onSaved?.({ mode: "edit", updatedId: bankId });
        handleClose();
      } catch {
        onNotify?.({ message: t("errors.saveError"), severity: "error" });
        setWarning({ title: t("errors.saveErrorTitle"), message: t("errors.saveError") });
      } finally {
        setIsSubmitting(false);
      }
    },
    [canEdit, formData, mode, bankId, orgCurrency, onNotify, onSaved, handleClose, t]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-[860px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                BK
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug truncate">{title}</h1>
              </div>
            </div>

            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none disabled:opacity-50"
              onClick={attemptClose}
              aria-label={t("modal.close")}
              disabled={isSubmitting || isDetailLoading}
            >
              &times;
            </button>
          </div>
        </header>

        {/* Body */}
        <form id="bankModalForm" className="flex-1 flex flex-col" onSubmit={submit}>
          <div className="relative z-10 px-5 py-4 overflow-visible flex-1">
            {mode === "edit" && isDetailLoading ? (
              <ModalSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  kind="text"
                  label={t("field.institution")}
                  name="institution"
                  ref={institutionRef}
                  value={formData.institution}
                  onChange={(e) => setFormData((p) => ({ ...p, institution: e.target.value }))}
                  required
                  disabled={isSubmitting || isDetailLoading || !canEdit}
                />

                <SelectDropdown<{ value: AccountType; label: string }>
                  label={t("field.accountType")}
                  items={accountTypeOptions}
                  selected={accountTypeOptions.filter((o) => o.value === formData.account_type)}
                  onChange={(items) => items[0] && setFormData((p) => ({ ...p, account_type: items[0].value }))}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("btn.selectAccountType")}
                  customStyles={{ maxHeight: "240px" }}
                  disabled={isSubmitting || isDetailLoading || !canEdit}
                />

                <Input
                  kind="text"
                  label={t("field.branch")}
                  name="branch"
                  value={formData.branch}
                  onChange={(e) => setFormData((p) => ({ ...p, branch: e.target.value }))}
                  disabled={isSubmitting || isDetailLoading || !canEdit}
                />

                <Input
                  kind="text"
                  label={t("field.accountNumber")}
                  name="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData((p) => ({ ...p, account_number: e.target.value }))}
                  disabled={isSubmitting || isDetailLoading || !canEdit}
                />

                <Input
                  kind="text"
                  label={t("field.iban")}
                  name="iban"
                  value={formData.iban}
                  onChange={(e) => setFormData((p) => ({ ...p, iban: e.target.value }))}
                  disabled={isSubmitting || isDetailLoading || !canEdit}
                />

                <Input
                  kind="amount"
                  label={t("field.initialBalance")}
                  value={formData.initial_balance}
                  onValueChange={(nextMajor) =>
                    setFormData((p) => ({ ...p, initial_balance: nextMajor || "0.00" }))
                  }
                  display="currency"
                  currency={orgCurrency}
                  disabled={isSubmitting || isDetailLoading || !canEdit}
                  zeroAsEmpty
                />

                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <Checkbox
                    checked={!!formData.is_active}
                    onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                    disabled={isSubmitting || isDetailLoading || !canEdit}
                  />
                  {t("field.isActive")}
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {formData.institution.trim() ? (
                <>
                  {t("footer.account")} <b>{formData.institution.trim()}</b>
                </>
              ) : (
                <>{t("footer.enterInstitution")}</>
              )}
              <span className="ml-3 text-gray-400">{t("footer.shortcuts")}</span>
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={attemptClose} disabled={isSubmitting || isDetailLoading}>
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isSaveDisabled}>
                {t("btn.save")}
              </Button>
            </div>
          </footer>
        </form>

        {/* Discard changes overlay */}
        {showCloseConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-gray-900">{t("confirmDiscard.title")}</h2>
                <p className="mt-1 text-[12px] text-gray-600">{t("confirmDiscard.message")}</p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  {t("btn.cancel")}
                </Button>
                <Button variant="danger" className="!bg-red-500 hover:!bg-red-600" onClick={handleClose}>
                  {t("actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Warning overlay */}
        {warning && (
          <div className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h2 className="text-[15px] font-semibold text-amber-800">{warning.title}</h2>
                <p className="mt-1 text-[12px] text-amber-700">{warning.message}</p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setWarning(null);
                    setTimeout(() => institutionRef.current?.focus(), 0);
                  }}
                >
                  {t("actions.ok")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankModal;

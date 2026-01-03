/* -------------------------------------------------------------------------- */
/* File: src/pages/LedgerAccountModal.tsx                              */
/* i18n: namespace "ledgerAccountsSettings"                                    */
/* Modal UI: aligned to EntriesModal (header/body/footer + overlays)           */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "src/components/ui/Input";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { SelectDropdown } from "@/components/ui/SelectDropdown";

type TxType = "debit" | "credit";

type CategoryKey =
  | "operationalRevenue"
  | "nonOperationalRevenue"
  | "operationalExpense"
  | "nonOperationalExpense";

type FormState = {
  account: string;
  category: CategoryKey | "";
  subcategory: string;
  code?: string;
  is_active?: boolean;
};

type CategoryOption = {
  key: CategoryKey;
  label: string;
  inferredTx: TxType;
};

type SubgroupOption = { label: string; value: string };

export type LedgerAccountModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initial: FormState;

  categoryOptions: CategoryOption[];
  getSubgroupOptions: (category: CategoryKey) => SubgroupOption[];

  busy?: boolean;

  onClose: () => void;
  onSubmit: (data: FormState) => Promise<void>;
};

/* ------------------------------ Stable helpers ------------------------------ */

const IDS = {
  form: "LedgerAccountModalForm",
  categoryWrap: "ledger-category-wrap",
  subgroupWrap: "ledger-subgroup-wrap",
  accountInput: "ledger-account-input",
} as const;

function isDropdownOpen() {
  return !!document.querySelector('[data-select-open="true"]');
}

function normalizeForCompare(raw: FormState): Required<FormState> {
  return {
    account: (raw.account || "").trim(),
    category: (raw.category || "") as CategoryKey | "",
    subcategory: (raw.subcategory || "").trim(),
    code: (raw.code || "").trim(),
    is_active: typeof raw.is_active === "boolean" ? raw.is_active : true,
  };
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

function focusFirstInteractive(wrapId?: string) {
  if (!wrapId) return;
  const scope = document.getElementById(wrapId) || document.querySelector<HTMLElement>(`#${wrapId}`);
  const el = scope?.querySelector<HTMLElement>("input,button,select,[tabindex]") || scope || null;
  el?.focus();
}

const LedgerAccountModal: React.FC<LedgerAccountModalProps> = ({
  open,
  mode,
  initial,
  categoryOptions,
  getSubgroupOptions,
  busy = false,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation("ledgerAccountsSettings");

  const accountRef = useRef<HTMLInputElement>(null);
  const initialRef = useRef<Required<FormState>>(normalizeForCompare(initial));

  const [form, setForm] = useState<FormState>(initial);
  const [addingNewSubgroup, setAddingNewSubgroup] = useState(false);

  // local submission guard
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const effectiveBusy = busy || localSubmitting;

  // overlays (same pattern as EntriesModal)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string; focusId?: string } | null>(null);

  const subgroupOptions = useMemo(() => {
    if (!form.category) return [];
    return getSubgroupOptions(form.category);
  }, [form.category, getSubgroupOptions]);

  const selectedCategory = useMemo(() => {
    if (!form.category) return null;
    return categoryOptions.find((c) => c.key === form.category) ?? null;
  }, [form.category, categoryOptions]);

  const canSave = useMemo(() => {
    return !!form.account.trim() && !!form.category && !!form.subcategory.trim() && !effectiveBusy;
  }, [form.account, form.category, form.subcategory, effectiveBusy]);

  const isDirty = useMemo(() => {
    if (!open) return false;
    const cur = normalizeForCompare(form);
    return !shallowEqual(cur, initialRef.current);
  }, [open, form]);

  const resetInternalState = useCallback(() => {
    setForm(initial);
    setAddingNewSubgroup(false);
    setLocalSubmitting(false);
    setShowCloseConfirm(false);
    setWarning(null);
  }, [initial]);

  useEffect(() => {
    if (!open) return;

    initialRef.current = normalizeForCompare(initial);
    setForm(initial);
    setAddingNewSubgroup(false);
    setLocalSubmitting(false);
    setShowCloseConfirm(false);
    setWarning(null);

    // focus after open paint
    setTimeout(() => accountRef.current?.focus(), 60);
  }, [open, initial]);

  // lock body scroll
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback(() => {
    resetInternalState();
    onClose();
  }, [onClose, resetInternalState]);

  const attemptClose = useCallback(() => {
    if (!open) return;
    if (effectiveBusy) return;
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

    handleClose();
  }, [open, effectiveBusy, warning, showCloseConfirm, isDirty, handleClose]);

  // Keyboard: ESC, Ctrl/⌘+S
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (effectiveBusy) return;
        (document.getElementById(IDS.form) as HTMLFormElement | null)?.requestSubmit();
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, attemptClose, effectiveBusy]);

  const handleCategoryChange = useCallback((items: { label: string; value: CategoryKey }[]) => {
    const sel = items[0];
    if (!sel) {
      setForm((p) => ({ ...p, category: "", subcategory: "" }));
      setAddingNewSubgroup(false);
      return;
    }
    setForm((p) => ({ ...p, category: sel.value, subcategory: "" }));
    setAddingNewSubgroup(false);

    // focus subgroup next (matches “guided” UX of EntriesModal)
    setTimeout(() => focusFirstInteractive(IDS.subgroupWrap), 0);
  }, []);

  const handleSubgroupChange = useCallback((items: { label: string; value: string }[]) => {
    const sel = items[0];
    setForm((p) => ({ ...p, subcategory: sel ? sel.value : "" }));
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (effectiveBusy) return;

      const ok =
        !!form.account.trim() && !!form.category && !!form.subcategory.trim();

      if (!ok) {
        setWarning({
          title: t("modal.validationTitle", { defaultValue: "Check required fields" }),
          message: t("modal.validationMessage", {
            defaultValue: "Account, category and subgroup are required.",
          }),
          focusId: !form.account.trim()
            ? IDS.accountInput
            : !form.category
              ? IDS.categoryWrap
              : IDS.subgroupWrap,
        });
        return;
      }

      setLocalSubmitting(true);
      try {
        await onSubmit({
          ...form,
          account: form.account.trim(),
          subcategory: form.subcategory.trim(),
          code: form.code?.trim() ? form.code.trim() : "",
          is_active: typeof form.is_active === "boolean" ? form.is_active : true,
        });
        // parent is expected to close modal on success
      } catch (err) {
        console.error(err);
        setWarning({
          title: t("modal.saveErrorTitle", { defaultValue: "Save failed" }),
          message: t("toast.saveError", { defaultValue: "Failed to save." }),
        });
      } finally {
        setLocalSubmitting(false);
      }
    },
    [effectiveBusy, form, onSubmit, t]
  );

  const footerLeft = useMemo(() => {
    if (selectedCategory) {
      return (
        <>
          {t("modal.defaultTxLabel", { defaultValue: "Default transaction:" })}{" "}
          <b>
            {selectedCategory.inferredTx === "credit"
              ? t("tags.credit")
              : t("tags.debit")}
          </b>
        </>
      );
    }
    return <>{t("modal.defaultTxHint")}</>;
  }, [selectedCategory, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-[820px] max-w-[95vw] h-[520px] max-h-[90vh] flex flex-col"
      >
        {/* Header (EntriesModal-like) */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                GL
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("title", { defaultValue: "Ledger Accounts" })}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {mode === "create" ? t("modal.createTitle") : t("modal.editTitle")}
                </h1>
              </div>
            </div>

            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none disabled:opacity-50"
              onClick={attemptClose}
              aria-label={t("buttons.cancel")}
              disabled={effectiveBusy}
            >
              &times;
            </button>
          </div>
        </header>

        {/* Body */}
        <form
          id={IDS.form}
          className="flex-1 flex flex-col"
          onSubmit={submit}
        >
          <div className="relative z-10 px-5 py-4 overflow-visible flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                kind="text"
                ref={accountRef}
                id={IDS.accountInput}
                label={t("modal.account")}
                name="account"
                value={form.account}
                onChange={(e) => setForm((p) => ({ ...p, account: e.target.value }))}
                required
                disabled={effectiveBusy}
              />

              <Input
                kind="text"
                label={t("modal.code")}
                name="code"
                value={form.code || ""}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder={t("modal.codePlaceholder")}
                disabled={effectiveBusy}
              />

              <div id={IDS.categoryWrap} className="md:col-span-2">
                <SelectDropdown<{ label: string; value: CategoryKey }>
                  label={t("filters.category")}
                  items={categoryOptions.map((c) => ({ label: c.label, value: c.key }))}
                  selected={
                    form.category
                      ? [{ label: t(`categories.${form.category}`), value: form.category }]
                      : []
                  }
                  onChange={handleCategoryChange}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("buttons.selectCategory")}
                  clearOnClickOutside={false}
                  customStyles={{ maxHeight: "240px" }}
                  disabled={effectiveBusy || !form.account.trim()}
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-[1fr_auto] gap-2 items-end">
                <div id={IDS.subgroupWrap}>
                  {addingNewSubgroup ? (
                    <Input
                      kind="text"
                      label={t("modal.subcategoryNew")}
                      name="subcategory"
                      value={form.subcategory}
                      onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
                      disabled={effectiveBusy || !form.category}
                      required
                    />
                  ) : (
                    <SelectDropdown<{ label: string; value: string }>
                      label={t("modal.subcategory")}
                      items={subgroupOptions}
                      selected={
                        form.subcategory
                          ? [{ label: form.subcategory, value: form.subcategory }]
                          : []
                      }
                      onChange={handleSubgroupChange}
                      getItemKey={(i) => i.value}
                      getItemLabel={(i) => i.label}
                      singleSelect
                      hideCheckboxes
                      buttonLabel={t("buttons.selectSubcategory")}
                      clearOnClickOutside={false}
                      customStyles={{ maxHeight: "240px" }}
                      disabled={effectiveBusy || !form.category}
                    />
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddingNewSubgroup((v) => !v);
                    setForm((p) => ({ ...p, subcategory: "" }));
                    setTimeout(() => focusFirstInteractive(IDS.subgroupWrap), 0);
                  }}
                  disabled={effectiveBusy || !form.category}
                >
                  {addingNewSubgroup ? t("buttons.toggleNewSubCancel") : t("buttons.toggleNewSub")}
                </Button>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={typeof form.is_active === "boolean" ? form.is_active : true}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                    disabled={effectiveBusy}
                  />
                  {t("modal.active")}
                </label>
              </div>
            </div>
          </div>

          {/* Footer (EntriesModal-like) */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {footerLeft}
              <span className="ml-3 text-gray-400">
                {t("footer.shortcuts", {
                  defaultValue: "Shortcuts: Esc close • Ctrl/⌘+S save",
                })}
              </span>
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={attemptClose} disabled={effectiveBusy}>
                {t("buttons.cancel")}
              </Button>
              <Button type="submit" disabled={!canSave}>
                {effectiveBusy
                  ? t("buttons.saving", { defaultValue: "Saving…" })
                  : t("buttons.save")}
              </Button>
            </div>
          </footer>
        </form>

        {/* Close confirm overlay (EntriesModal-like) */}
        {showCloseConfirm && (
          <div
            className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="close-confirm-title"
            aria-describedby="close-confirm-desc"
          >
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 id="close-confirm-title" className="text-[15px] font-semibold text-gray-900">
                  {t("confirmDiscard.title", { defaultValue: "Discard changes?" })}
                </h2>
                <p id="close-confirm-desc" className="mt-1 text-[12px] text-gray-600">
                  {t("confirmDiscard.message", {
                    defaultValue: "You have unsaved changes. Do you want to discard them?",
                  })}
                </p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => setShowCloseConfirm(false)}
                  disabled={effectiveBusy}
                >
                  {t("actions.back", { defaultValue: "Back" })}
                </Button>
                <Button
                  variant="danger"
                  className="!bg-red-500 hover:!bg-red-600"
                  onClick={handleClose}
                  disabled={effectiveBusy}
                >
                  {t("actions.discard", { defaultValue: "Discard" })}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Warning overlay (EntriesModal-like) */}
        {warning && (
          <div
            className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="warn-title"
            aria-describedby="warn-desc"
          >
            <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h2 id="warn-title" className="text-[15px] font-semibold text-amber-800">
                  {warning.title}
                </h2>
                <p id="warn-desc" className="mt-1 text-[12px] text-amber-700">
                  {warning.message}
                </p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    const fId = warning.focusId;
                    setWarning(null);
                    setTimeout(() => focusFirstInteractive(fId), 0);
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

export default LedgerAccountModal;

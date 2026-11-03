import { SettingsModalForm } from "@/shared/ui/Settings/SettingsModalContent";
import CurrencySelect from "@/shared/ui/CurrencySelect";
import AccountingTerm from "@/pages/AccountingSettings/components/AccountingTerm";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
// src\pages\LedgerAccountSettings\components\LedgerAccountModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { Select } from "src/shared/ui/Select";

import type {
  AddLedgerAccountRequest,
  LedgerAccount,
  LedgerAccountType,
  LedgerNormalBalance,
  LedgerStatementSection,
} from "@/models/settings/ledgerAccounts";

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  initial?: Partial<LedgerAccount> | null;
  parentOptions: Array<{ label: string; value: string }>;
  languageCode?: string | null;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: AddLedgerAccountRequest) => Promise<void>;
};

const DEFAULTS: AddLedgerAccountRequest = {
  code: "",
  name: "",
  description: "",
  parent_id: null,
  account_type: "posting",
  statement_section: "expense",
  normal_balance: "debit",
  is_bank_control: false,
  allows_manual_posting: true,
  is_active: true,
  report_group: "",
  report_subgroup: "",
  external_ref: "",
  currency_code: "",
  metadata: {},
};

const optionKey = <T extends string>(item: Option<T>) => item.value;
const optionLabel = <T extends string>(item: Option<T>) => item.label;

const FieldGroup = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{title}</div>
    </div>
    <div className="space-y-4 px-4 py-4">{children}</div>
  </section>
);

const ToggleRow = ({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) => (
  <label
    className={[
      "flex items-center justify-between gap-3 rounded-md border px-3 py-3",
      disabled
        ? "border-gray-200 bg-gray-50 text-gray-400"
        : "border-gray-300 bg-white text-gray-700",
    ].join(" ")}
  >
    <span className="text-[13px] font-medium">{label}</span>
    <input type="checkbox" className="h-4 w-4 shrink-0 accent-gray-900"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
  </label>
);

const LedgerAccountModal: React.FC<Props> = ({
  isOpen,
  mode,
  initial,
  parentOptions,
  busy = false,
  onClose,
  onSubmit,
}) => {
  const { i18n } = useTranslation("ledgerAccounts");
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const t = React.useCallback(
    (key: string, defaultValue: string) =>
      String(
        i18n.t(key, {
          lng: language,
          ns: "ledgerAccounts",
          defaultValue,
        })
      ),
    [i18n, language]
  );

  const sectionLabel = React.useCallback((value: LedgerStatementSection) => String(i18n.t(`common.sections.${value === "off_balance" ? "offBalance" : value}`, { ns: "accountingSettings", lng: language })), [i18n, language]);
  const [form, setForm] = useState<AddLedgerAccountRequest>(DEFAULTS);
  const [metadataText, setMetadataText] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(isOpen);

  const sectionOptions = useMemo<Option<LedgerStatementSection>[]>(
    () => [
      { value: "asset", label: sectionLabel("asset") },
      { value: "liability", label: sectionLabel("liability") },
      { value: "equity", label: sectionLabel("equity") },
      { value: "income", label: sectionLabel("income") },
      { value: "expense", label: sectionLabel("expense") },
      { value: "off_balance", label: sectionLabel("off_balance") },
      { value: "statistical", label: sectionLabel("statistical") },
    ],
    [sectionLabel]
  );

  const balanceOptions = useMemo<Option<LedgerNormalBalance>[]>(
    () => [
      { value: "debit", label: t("modal.debit", "Debit") },
      { value: "credit", label: t("modal.credit", "Credit") },
    ],
    [t]
  );

  const accountTypeOptions = useMemo<Option<LedgerAccountType>[]>(
    () => [
      { value: "header", label: t("modal.header", "Header") },
      { value: "posting", label: t("modal.posting", "Posting") },
    ],
    [t]
  );

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setVisible(false);

      const id = window.setTimeout(() => setVisible(true), 16);
      return () => window.clearTimeout(id);
    }

    setVisible(false);

    const id = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const next: AddLedgerAccountRequest = {
      ...DEFAULTS,
      ...(initial ?? {}),
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      parent_id: initial?.parent_id ?? null,
      account_type: initial?.account_type ?? DEFAULTS.account_type,
      statement_section: initial?.statement_section ?? DEFAULTS.statement_section,
      normal_balance: initial?.normal_balance ?? DEFAULTS.normal_balance,
      is_bank_control: initial?.is_bank_control ?? DEFAULTS.is_bank_control,
      allows_manual_posting:
        initial?.allows_manual_posting ?? DEFAULTS.allows_manual_posting,
      is_active: initial?.is_active ?? DEFAULTS.is_active,
      report_group: initial?.report_group ?? "",
      report_subgroup: initial?.report_subgroup ?? "",
      external_ref: initial?.external_ref ?? "",
      currency_code: initial?.currency_code ?? "",
      metadata:
        initial?.metadata &&
        typeof initial.metadata === "object" &&
        !Array.isArray(initial.metadata)
          ? (initial.metadata as Record<string, unknown>)
          : {},
    };

    setForm(next);
    setMetadataText(JSON.stringify(next.metadata ?? {}, null, 2));
    setError(null);
  }, [initial, isOpen]);

  const selectedParent = useMemo(() => {
    if (!form.parent_id) return [];
    return parentOptions.filter((item) => item.value === form.parent_id);
  }, [form.parent_id, parentOptions]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.code.trim()) {
      setError(t("modal.requiredCode", "Code is required."));
      return;
    }

    if (!form.name.trim()) {
      setError(t("modal.requiredName", "Name is required."));
      return;
    }

    let parsedMetadata: Record<string, unknown> = {};
    try {
      parsedMetadata = metadataText.trim() ? JSON.parse(metadataText) : {};
    } catch {
      setError(t("modal.invalidJson", "Metadata must be valid JSON."));
      return;
    }

    try {
    await onSubmit({
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || "",
      report_group: form.report_group?.trim() || "",
      report_subgroup: form.report_subgroup?.trim() || "",
      external_ref: form.external_ref?.trim() || "",
      currency_code: form.currency_code?.trim().toUpperCase() || "",
      parent_id: form.parent_id || null,
      metadata: parsedMetadata,
      is_bank_control: form.account_type === "posting" ? !!form.is_bank_control : false,
      allows_manual_posting:
        form.account_type === "posting" ? !!form.allows_manual_posting : false,
    });
    } catch {
      setError(t("workspace.requestError", "Something went wrong. Please try again."));
    }
  };

  useDialogFocus(isOpen && mounted, dialogRef);

  if (!mounted) return null;

  return (
    <div className="accounting-dialog fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-gray-950/20" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-account-modal-title"
        className={[
          "settings-drawer settings-modal",
          "transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-200 bg-white/95">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                {t("workspace.pageLabel", "Settings")}
              </div>
              <h3
                id="ledger-account-modal-title"
                className="mt-1 truncate text-[18px] font-semibold text-gray-900"
              >
                {mode === "create"
                  ? t("modal.createTitle", "Create ledger account")
                  : t("modal.editTitle", "Edit ledger account")}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {mode === "create"
                  ? t(
                      "modal.createSubtitle",
                      "Create a ledger account with structure, classification, and posting controls."
                    )
                  : t(
                      "modal.editSubtitle",
                      "Update the ledger account structure, classification, and posting controls."
                    )}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="settings-modal-close"
              aria-label={t("modal.cancel", "Cancel")}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="settings-modal-content">
          <SettingsModalForm onSubmit={submit} className="flex flex-col gap-4 pb-4 md:pb-6">
            <div className="grid gap-5">
              <FieldGroup title={t("modal.general", "General")}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    kind="text"
                    label={t("modal.code", "Code")}
                    value={form.code}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        code: e.target.value,
                      }))
                    }
                  />

                  <Input
                    kind="text"
                    label={t("modal.name", "Name")}
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <Input
                  kind="text"
                  label={t("modal.description", "Description")}
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />

                <Select<{ label: string; value: string }>
                  label={t("modal.parent", "Parent account")}
                  items={parentOptions}
                  selected={selectedParent}
                  onChange={(items) =>
                    setForm((prev) => ({
                      ...prev,
                      parent_id: items[0]?.value ?? null,
                    }))
                  }
                  getItemKey={(item) => item.value}
                  getItemLabel={(item) => item.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("modal.parentPlaceholder", "No parent")}
                />
              </FieldGroup>

              <FieldGroup title={t("modal.classification", "Classification")}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select<Option<LedgerAccountType>>
                    label={<AccountingTerm term="posting">{t("modal.accountType", "Account type")}</AccountingTerm>}
                    items={accountTypeOptions}
                    selected={accountTypeOptions.filter((item) => item.value === form.account_type)}
                    onChange={(items) =>
                      setForm((prev) => ({
                        ...prev,
                        account_type: items[0]?.value ?? "posting",
                      }))
                    }
                    getItemKey={optionKey}
                    getItemLabel={optionLabel}
                    singleSelect
                    hideCheckboxes
                    buttonLabel={t("modal.selectAccountType", "Select account type")}
                  />

                  <Select<Option<LedgerStatementSection>>
                    label={<AccountingTerm term="section">{t("modal.statementSection", "Statement section")}</AccountingTerm>}
                    items={sectionOptions}
                    selected={sectionOptions.filter((item) => item.value === form.statement_section)}
                    onChange={(items) =>
                      setForm((prev) => ({
                        ...prev,
                        statement_section: items[0]?.value ?? "expense",
                      }))
                    }
                    getItemKey={optionKey}
                    getItemLabel={optionLabel}
                    singleSelect
                    hideCheckboxes
                    buttonLabel={t("modal.selectSection", "Select section")}
                  />
                </div>

                <Select<Option<LedgerNormalBalance>>
                  label={<AccountingTerm term="normalBalance">{t("modal.normalBalance", "Normal balance")}</AccountingTerm>}
                  items={balanceOptions}
                  selected={balanceOptions.filter((item) => item.value === form.normal_balance)}
                  onChange={(items) =>
                    setForm((prev) => ({
                      ...prev,
                      normal_balance: items[0]?.value ?? "debit",
                    }))
                  }
                  getItemKey={optionKey}
                  getItemLabel={optionLabel}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("modal.selectBalance", "Select balance")}
                />
              </FieldGroup>

              <FieldGroup title={t("modal.controls", "Controls")}>
                <ToggleRow
                  label={t("modal.active", "Active")}
                  checked={!!form.is_active}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: value,
                    }))
                  }
                />

                <ToggleRow
                  label={<AccountingTerm term="bankControl">{t("modal.bankControl", "Bank control account")}</AccountingTerm>}
                  checked={!!form.is_bank_control}
                  disabled={form.account_type !== "posting"}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      is_bank_control: value,
                    }))
                  }
                />

                <ToggleRow
                  label={<AccountingTerm term="manualPosting">{t("modal.manualPosting", "Allow manual posting")}</AccountingTerm>}
                  checked={!!form.allows_manual_posting}
                  disabled={form.account_type !== "posting"}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      allows_manual_posting: value,
                    }))
                  }
                />
              </FieldGroup>

              <details className="rounded-lg border border-gray-200 bg-white">
                <summary className="flex items-center justify-between px-4 py-4 text-sm font-medium">{t("modal.advanced", "Advanced")}</summary>
                <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    kind="text"
                    label={t("modal.reportGroup", "Report group")}
                    value={form.report_group || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        report_group: e.target.value,
                      }))
                    }
                  />

                  <Input
                    kind="text"
                    label={t("modal.reportSubgroup", "Report subgroup")}
                    value={form.report_subgroup || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        report_subgroup: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    kind="text"
                    label={t("modal.externalRef", "External reference")}
                    value={form.external_ref || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        external_ref: e.target.value,
                      }))
                    }
                  />

                  <CurrencySelect value={form.currency_code || ""} onChange={currency_code => setForm(prev => ({ ...prev, currency_code }))} optional />
                </div>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold text-gray-700">
                    {t("modal.metadata", "Metadata (JSON)")}
                  </span>
                  <textarea
                    value={metadataText}
                    onChange={(e) => setMetadataText(e.target.value)}
                    className="min-h-[180px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 font-mono text-[13px] text-gray-900 outline-none transition-colors focus:border-gray-400"
                  />
                </label>
                </div>
              </details>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </div>
            ) : null}

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white py-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("modal.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {mode === "create"
                  ? t("modal.saveCreate", "Create account")
                  : t("modal.saveEdit", "Save changes")}
              </Button>
            </div>
          </SettingsModalForm>
        </div>
      </div>
    </div>
  );
};

export default LedgerAccountModal;

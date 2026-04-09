// src\pages\LedgerAccountSettings\LedgerAccountModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

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
  busy?: boolean;
  messages: Record<string, string>;
  onClose: () => void;
  onSubmit: (payload: AddLedgerAccountRequest) => Promise<void>;
};

const optionKey = <T extends string>(item: Option<T>) => item.value;
const optionLabel = <T extends string>(item: Option<T>) => item.label;

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

const sectionOptions: Option<LedgerStatementSection>[] = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "off_balance", label: "Off balance" },
  { value: "statistical", label: "Statistical" },
];

const balanceOptions: Option<LedgerNormalBalance>[] = [
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
];

const FieldGroup = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-gray-200 bg-white">
    <div className="border-b border-gray-200 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{title}</div>
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
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) => (
  <label
    className={[
      "flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5",
      disabled ? "bg-gray-50 text-gray-400" : "bg-white text-gray-700",
    ].join(" ")}
  >
    <span className="text-sm">{label}</span>
    <Checkbox
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      size="sm"
      colorClass="defaultColor"
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
  messages,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<AddLedgerAccountRequest>(DEFAULTS);
  const [metadataText, setMetadataText] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setVisible(false);

      const enterId = window.setTimeout(() => {
        setVisible(true);
      }, 16);

      return () => window.clearTimeout(enterId);
    }

    setVisible(false);
    const closeId = window.setTimeout(() => {
      setMounted(false);
    }, 240);

    return () => window.clearTimeout(closeId);
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [mounted]);

  useEffect(() => {
    if (!isOpen) return;

    const next: AddLedgerAccountRequest = {
      ...DEFAULTS,
      ...(initial ?? {}),
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      report_group: initial?.report_group ?? "",
      report_subgroup: initial?.report_subgroup ?? "",
      external_ref: initial?.external_ref ?? "",
      currency_code: initial?.currency_code ?? "",
      parent_id: initial?.parent_id ?? null,
      account_type: initial?.account_type ?? DEFAULTS.account_type,
      statement_section: initial?.statement_section ?? DEFAULTS.statement_section,
      normal_balance: initial?.normal_balance ?? DEFAULTS.normal_balance,
      is_bank_control: initial?.is_bank_control ?? DEFAULTS.is_bank_control,
      allows_manual_posting:
        initial?.allows_manual_posting ?? DEFAULTS.allows_manual_posting,
      is_active: initial?.is_active ?? DEFAULTS.is_active,
      is_system: initial?.is_system ?? DEFAULTS.is_system,
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
  }, [isOpen, initial]);

  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  const accountTypeOptions = useMemo<Option<LedgerAccountType>[]>(
    () => [
      { value: "header", label: messages.header },
      { value: "posting", label: messages.posting },
    ],
    [messages]
  );

  const selectedParent = useMemo(() => {
    if (!form.parent_id) return [];
    return parentOptions.filter((item) => item.value === form.parent_id);
  }, [form.parent_id, parentOptions]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.code.trim()) {
      setError(messages.requiredCode);
      return;
    }

    if (!form.name.trim()) {
      setError(messages.requiredName);
      return;
    }

    let parsedMetadata: Record<string, unknown> = {};
    try {
      parsedMetadata = metadataText.trim() ? JSON.parse(metadataText) : {};
    } catch {
      setError(messages.invalidJson);
      return;
    }

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
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label={messages.cancel}
        className="absolute inset-0"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-account-modal-title"
        className={[
          "absolute inset-y-0 right-0 flex h-full w-full max-w-[980px] flex-col border-l border-gray-200 bg-white",
          "transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                {mode === "create" ? messages.createTitle : messages.editTitle}
              </div>
              <h3
                id="ledger-account-modal-title"
                className="mt-1 truncate text-[18px] font-semibold text-gray-900"
              >
                {mode === "create" ? messages.createTitle : messages.editTitle}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              aria-label={messages.cancel}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <FieldGroup title={messages.general}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    kind="text"
                    label={messages.code}
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
                    label={messages.name}
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
                  label={messages.description}
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />

                <SelectDropdown<{ label: string; value: string }>
                  label={messages.parent}
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
                  buttonLabel={messages.parentPlaceholder}
                />
              </FieldGroup>

              <FieldGroup title={messages.classification}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectDropdown<Option<LedgerAccountType>>
                    label={messages.accountType}
                    items={accountTypeOptions}
                    selected={accountTypeOptions.filter((x) => x.value === form.account_type)}
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
                    buttonLabel={messages.selectAccountType}
                  />

                  <SelectDropdown<Option<LedgerStatementSection>>
                    label={messages.statementSection}
                    items={sectionOptions}
                    selected={sectionOptions.filter((x) => x.value === form.statement_section)}
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
                    buttonLabel={messages.selectSection}
                  />
                </div>

                <SelectDropdown<Option<LedgerNormalBalance>>
                  label={messages.normalBalance}
                  items={balanceOptions}
                  selected={balanceOptions.filter((x) => x.value === form.normal_balance)}
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
                  buttonLabel={messages.selectBalance}
                />
              </FieldGroup>

              <FieldGroup title={messages.controls}>
                <ToggleRow
                  label={messages.active}
                  checked={!!form.is_active}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: value,
                    }))
                  }
                />

                <ToggleRow
                  label={messages.bankControl}
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
                  label={messages.manualPosting}
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

              <FieldGroup title={messages.advanced}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    kind="text"
                    label={messages.reportGroup}
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
                    label={messages.reportSubgroup}
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
                    label={messages.externalRef}
                    value={form.external_ref || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        external_ref: e.target.value,
                      }))
                    }
                  />

                  <Input
                    kind="text"
                    label={messages.currencyCode}
                    value={form.currency_code || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        currency_code: e.target.value,
                      }))
                    }
                  />
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    {messages.metadata}
                  </span>
                  <textarea
                    className="min-h-[180px] w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-gray-500"
                    value={metadataText}
                    onChange={(e) => setMetadataText(e.target.value)}
                  />
                </label>
              </FieldGroup>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          </div>

          <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 md:px-6">
            <div className="flex items-center justify-end gap-2">
              <Button type="submit" disabled={busy}>
                {mode === "create" ? messages.saveCreate : messages.saveEdit}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default LedgerAccountModal;

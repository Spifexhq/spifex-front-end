/* -------------------------------------------------------------------------- */
/* File: src/pages/EntitySettings/EntityModal.tsx                              */
/* Design: aligned to EntriesModal (tabs + header/body/footer + overlays)      */
/* i18n: namespace "entitySettings"                                            */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/components/ui/Button";
import Input from "src/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import Shimmer from "@/components/ui/Loaders/Shimmer";
import { SelectDropdown } from "@/components/ui/SelectDropdown";

import { api } from "@/api/requests";

import type { Entity } from "@/models/settings/entities";

type EntityTypeValue = "client" | "supplier" | "employee";
type EntityModalMode = "create" | "edit";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type Tab = "general" | "tax" | "address" | "bank";

export type EntityModalProps = {
  isOpen: boolean;
  mode: EntityModalMode;
  entity?: Entity | null; // used for edit
  onClose: () => void;

  onNotify?: (snack: Snack) => void;
  onSaved?: (result: { mode: EntityModalMode; created?: Entity }) => void;

  canEdit?: boolean;
};

const ENTITY_TYPE_VALUES: EntityTypeValue[] = ["client", "supplier", "employee"];
const ENTITY_TYPE_ITEMS: { value: EntityTypeValue }[] = ENTITY_TYPE_VALUES.map((v) => ({ value: v }));

const IDS = {
  tabsGeneral: "entity-tab-general",
  tabsTax: "entity-tab-tax",
  tabsAddress: "entity-tab-address",
  tabsBank: "entity-tab-bank",
} as const;

const TAB_LIST_BASE: { id: Tab; labelKey: string; wrapId: string }[] = [
  { id: "general", labelKey: "tabs.general", wrapId: IDS.tabsGeneral },
  { id: "tax", labelKey: "tabs.tax", wrapId: IDS.tabsTax },
  { id: "address", labelKey: "tabs.address", wrapId: IDS.tabsAddress },
  { id: "bank", labelKey: "tabs.bank", wrapId: IDS.tabsBank },
];

const emptyForm = {
  full_name: "",
  alias_name: "",
  entity_type: "client" as EntityTypeValue,
  is_active: true,

  ssn_tax_id: "",
  ein_tax_id: "",
  email: "",
  phone: "",

  street: "",
  street_number: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",

  bank_name: "",
  bank_branch: "",
  checking_account: "",
  account_holder_tax_id: "",
  account_holder_name: "",
};
type FormState = typeof emptyForm;

const ModalSkeleton: React.FC = () => (
  <div className="space-y-5 py-1">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Shimmer className="h-10 rounded-md lg:col-span-2" />
      <Shimmer className="h-10 rounded-md" />
      <Shimmer className="h-10 rounded-md" />
      <Shimmer className="h-10 rounded-md" />
      <Shimmer className="h-10 rounded-md" />
      <Shimmer className="h-10 rounded-md" />
      <Shimmer className="h-10 rounded-md" />
      <div className="flex items-center gap-2 pt-2">
        <Shimmer className="h-5 w-5 rounded-sm" />
        <Shimmer className="h-3 w-24 rounded-md" />
      </div>
    </div>

    <div className="space-y-3">
      <Shimmer className="h-3 w-32 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Shimmer className="h-10 rounded-md lg:col-span-2" />
        <Shimmer className="h-10 rounded-md" />
        <Shimmer className="h-10 rounded-md" />
        <Shimmer className="h-10 rounded-md" />
        <Shimmer className="h-10 rounded-md" />
        <Shimmer className="h-10 rounded-md" />
      </div>
    </div>

    <div className="space-y-3">
      <Shimmer className="h-3 w-40 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Shimmer className="h-10 rounded-md" />
        <Shimmer className="h-10 rounded-md" />
        <Shimmer className="h-10 rounded-md" />
        <Shimmer className="h-10 rounded-md" />
        <Shimmer className="h-10 rounded-md lg:col-span-2" />
      </div>
    </div>

    <div className="flex justify-end gap-2 pt-1">
      <Shimmer className="h-9 w-24 rounded-md" />
      <Shimmer className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

function isDropdownOpen() {
  return !!document.querySelector('[data-select-open="true"]');
}

function focusFirstInteractive(wrapId?: string) {
  if (!wrapId) return;
  const scope = document.getElementById(wrapId) || document.querySelector<HTMLElement>(`#${wrapId}`);
  const el = scope?.querySelector<HTMLElement>("input,button,select,textarea,[tabindex]") || scope || null;
  el?.focus();
}

function normalizeDirtyComparable(form: FormState) {
  const trim = (v: string) => (v ?? "").trim();
  return {
    ...form,
    full_name: trim(form.full_name),
    alias_name: trim(form.alias_name),
    ssn_tax_id: trim(form.ssn_tax_id),
    ein_tax_id: trim(form.ein_tax_id),
    email: trim(form.email),
    phone: trim(form.phone),

    street: trim(form.street),
    street_number: trim(form.street_number),
    city: trim(form.city),
    state: trim(form.state),
    postal_code: trim(form.postal_code),
    country: trim(form.country),

    bank_name: trim(form.bank_name),
    bank_branch: trim(form.bank_branch),
    checking_account: trim(form.checking_account),
    account_holder_tax_id: trim(form.account_holder_tax_id),
    account_holder_name: trim(form.account_holder_name),
  };
}

const EntityModal: React.FC<EntityModalProps> = ({
  isOpen,
  mode,
  entity,
  onClose,
  onNotify,
  onSaved,
  canEdit = true,
}) => {
  const { t } = useTranslation("entitySettings");

  // IMPORTANT: primitive dep, avoids redundant `entity?.id` in hook deps.
  const entityId = entity?.id ?? null;

  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string; focusWrapId?: string } | null>(null);

  const fullNameRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef<string>(JSON.stringify(normalizeDirtyComparable(emptyForm)));

  const TAB_LIST = useMemo(
    () => TAB_LIST_BASE.map((x) => ({ ...x, label: t(x.labelKey) })),
    [t]
  );

  const badgeText = useMemo(() => {
    const v = (formData.entity_type || "client") as EntityTypeValue;
    if (v === "client") return "CL";
    if (v === "supplier") return "SU";
    return "EM";
  }, [formData.entity_type]);

  const title = mode === "create" ? t("modal.createTitle") : t("modal.editTitle");

  const isDirty = useMemo(() => {
    const now = JSON.stringify(normalizeDirtyComparable(formData));
    return now !== baselineRef.current;
  }, [formData]);

  const isSaveDisabled = useMemo(() => {
    if (!canEdit) return true;
    if (isSubmitting || isDetailLoading) return true;
    if (!formData.full_name.trim()) return true;
    return false;
  }, [canEdit, formData.full_name, isSubmitting, isDetailLoading]);

  const resetInternalState = useCallback(() => {
    setActiveTab("general");
    setFormData(emptyForm);
    setIsSubmitting(false);
    setIsDetailLoading(false);
    setShowCloseConfirm(false);
    setWarning(null);
    baselineRef.current = JSON.stringify(normalizeDirtyComparable(emptyForm));
  }, []);

  const handleClose = useCallback(() => {
    resetInternalState();
    onClose();
  }, [onClose, resetInternalState]);

  const attemptClose = useCallback(() => {
    if (isDropdownOpen()) return;

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
  }, [handleClose, isDirty, showCloseConfirm, warning]);

  const goTabRelative = useCallback(
    (delta: number) => {
      const idx = TAB_LIST.findIndex((x) => x.id === activeTab);
      if (idx === -1) return;
      const nextIdx = (idx + delta + TAB_LIST.length) % TAB_LIST.length;
      const next = TAB_LIST[nextIdx];
      setActiveTab(next.id);
      setTimeout(() => focusFirstInteractive(next.wrapId), 0);
    },
    [activeTab, TAB_LIST]
  );

  /* ------------------------------ Load detail on open ------------------------------ */
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      resetInternalState();

      // focus + baseline (create)
      if (mode === "create") {
        setTimeout(() => fullNameRef.current?.focus(), 60);
        return;
      }

      if (!entityId) return;

      setIsDetailLoading(true);

      try {
        const res = await api.getEntity(entityId);
        const detail = res.data as Entity;
        if (!alive) return;

        const next: FormState = {
          full_name: detail.full_name ?? "",
          alias_name: detail.alias_name ?? "",
          entity_type: (detail.entity_type as EntityTypeValue) ?? "client",
          is_active: detail.is_active ?? true,

          ssn_tax_id: detail.ssn_tax_id ?? "",
          ein_tax_id: detail.ein_tax_id ?? "",
          email: detail.email ?? "",
          phone: detail.phone ?? "",

          street: detail.street ?? "",
          street_number: detail.street_number ?? "",
          city: detail.city ?? "",
          state: detail.state ?? "",
          postal_code: detail.postal_code ?? "",
          country: detail.country ?? "",

          bank_name: detail.bank_name ?? "",
          bank_branch: detail.bank_branch ?? "",
          checking_account: detail.checking_account ?? "",
          account_holder_tax_id: detail.account_holder_tax_id ?? "",
          account_holder_name: detail.account_holder_name ?? "",
        };

        setFormData(next);
        baselineRef.current = JSON.stringify(normalizeDirtyComparable(next));
        setTimeout(() => fullNameRef.current?.focus(), 60);
      } catch {
        if (!alive) return;

        // fallback to partial entity (if provided)
        const fallback: FormState = {
          ...emptyForm,
          full_name: entity?.full_name ?? "",
          alias_name: entity?.alias_name ?? "",
          entity_type: ((entity?.entity_type as EntityTypeValue) ?? "client") as EntityTypeValue,
          is_active: entity?.is_active ?? true,

          ssn_tax_id: entity?.ssn_tax_id ?? "",
          ein_tax_id: entity?.ein_tax_id ?? "",
          email: entity?.email ?? "",
          phone: entity?.phone ?? "",

          street: entity?.street ?? "",
          street_number: entity?.street_number ?? "",
          city: entity?.city ?? "",
          state: entity?.state ?? "",
          postal_code: entity?.postal_code ?? "",
          country: entity?.country ?? "",

          bank_name: entity?.bank_name ?? "",
          bank_branch: entity?.bank_branch ?? "",
          checking_account: entity?.checking_account ?? "",
          account_holder_tax_id: entity?.account_holder_tax_id ?? "",
          account_holder_name: entity?.account_holder_name ?? "",
        };

        setFormData(fallback);
        baselineRef.current = JSON.stringify(normalizeDirtyComparable(fallback));
        onNotify?.({ message: t("errors.detailError"), severity: "error" });

        setTimeout(() => fullNameRef.current?.focus(), 60);
      } finally {
        if (alive) setIsDetailLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, mode, entityId, resetInternalState, onNotify, t, entity]);

  /* ------------------------------ Body scroll lock ------------------------------ */
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* ------------------------------ Keyboard: ESC, Ctrl/⌘+S, Ctrl+Alt+←/→ ------------------------------ */
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
        (document.getElementById("entityModalForm") as HTMLFormElement | null)?.requestSubmit();
        return;
      }

      if (e.ctrlKey && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        if (warning || showCloseConfirm) return;
        if (isDropdownOpen()) return;
        e.preventDefault();
        goTabRelative(e.key === "ArrowRight" ? 1 : -1);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose, goTabRelative, warning, showCloseConfirm]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((p) => ({ ...p, [name]: value }));
    },
    []
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canEdit) return;

      if (!formData.full_name.trim()) {
        setActiveTab("general");
        setWarning({
          title: t("errors.saveError"),
          message: t("row.untitled"),
          focusWrapId: IDS.tabsGeneral,
        });
        return;
      }

      const payload = {
        ...formData,
        ssn_tax_id: formData.ssn_tax_id.trim() || null,
        ein_tax_id: formData.ein_tax_id.trim() || null,

        email: formData.email.trim(),
        phone: formData.phone.trim(),

        bank_name: formData.bank_name.trim(),
        bank_branch: formData.bank_branch.trim(),
        checking_account: formData.checking_account.trim(),
        account_holder_tax_id: formData.account_holder_tax_id.trim(),
        account_holder_name: formData.account_holder_name.trim(),
      };

      setIsSubmitting(true);

      try {
        if (mode === "create") {
          const { data: created } = await api.addEntity(payload);
          onNotify?.({ message: t("toast.saveOk"), severity: "success" });
          onSaved?.({ mode: "create", created });
          handleClose();
          return;
        }

        if (!entityId) return;

        await api.editEntity(entityId, payload);
        onNotify?.({ message: t("toast.saveOk"), severity: "success" });
        onSaved?.({ mode: "edit" });
        handleClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("errors.saveError");
        onNotify?.({ message: msg, severity: "error" });
        setWarning({ title: t("errors.saveError"), message: msg });
      } finally {
        setIsSubmitting(false);
      }
    },
    // NOTE: entityId is the only entity-related dependency (fixes your lint warning)
    [canEdit, formData, mode, entityId, onNotify, onSaved, handleClose, t]
  );

  const Tabs: React.FC = () => (
    <nav className="flex gap-3 overflow-x-auto">
      {TAB_LIST.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setTimeout(() => focusFirstInteractive(tab.wrapId), 0);
            }}
            className={`px-3 py-2 text-[13px] border-b-2 ${
              isActive
                ? "border-[color:var(--accentPrimary)] text-[color:var(--accentPrimary)]"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div id={IDS.tabsGeneral} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <Input
                kind="text"
                ref={fullNameRef}
                label={t("field.full_name")}
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.alias_name")}
                name="alias_name"
                value={formData.alias_name}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <SelectDropdown<{ value: EntityTypeValue }>
                label={t("field.entity_type")}
                items={ENTITY_TYPE_ITEMS}
                selected={ENTITY_TYPE_ITEMS.filter((it) => it.value === formData.entity_type)}
                onChange={(items) => {
                  const next = items[0]?.value;
                  if (!next) return;
                  setFormData((p) => ({ ...p, entity_type: next }));
                }}
                getItemKey={(item) => item.value}
                getItemLabel={(item) => t(`types.${item.value}`)}
                singleSelect
                hideCheckboxes
                buttonLabel={t("field.entity_type")}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.email")}
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.phone")}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <label className="col-span-1 flex items-center gap-2 text-sm pt-6">
              <Checkbox
                size="small"
                checked={!!formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
              {t("field.is_active")}
            </label>
          </div>
        );

      case "tax":
        return (
          <div id={IDS.tabsTax} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Input
                kind="text"
                label={t("field.ssn_tax_id")}
                name="ssn_tax_id"
                value={formData.ssn_tax_id}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.ein_tax_id")}
                name="ein_tax_id"
                value={formData.ein_tax_id}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>
          </div>
        );

      case "address":
        return (
          <div id={IDS.tabsAddress} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <Input
                kind="text"
                label={t("field.street")}
                name="street"
                value={formData.street}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.street_number")}
                name="street_number"
                value={formData.street_number}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.city")}
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.state")}
                name="state"
                value={formData.state}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.postal_code")}
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.country")}
                name="country"
                value={formData.country}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>
          </div>
        );

      case "bank":
        return (
          <div id={IDS.tabsBank} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Input
                kind="text"
                label={t("field.bank_name")}
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.bank_branch")}
                name="bank_branch"
                value={formData.bank_branch}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.checking_account")}
                name="checking_account"
                value={formData.checking_account}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div>
              <Input
                kind="text"
                label={t("field.account_holder_tax_id")}
                name="account_holder_tax_id"
                value={formData.account_holder_tax_id}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>

            <div className="lg:col-span-2">
              <Input
                kind="text"
                label={t("field.account_holder_name")}
                name="account_holder_name"
                value={formData.account_holder_name}
                onChange={handleChange}
                disabled={isSubmitting || isDetailLoading || !canEdit}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-[1100px] max-w-[95vw] h-[580px] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {badgeText}
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

          <div className="px-5 pb-2">
            <Tabs />
          </div>
        </header>

        {/* Body */}
        <form id="entityModalForm" className="flex-1 flex flex-col" onSubmit={submit}>
          <div className="relative z-10 px-5 py-4 overflow-visible flex-1">
            {mode === "edit" && isDetailLoading ? <ModalSkeleton /> : renderTabContent()}
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {formData.full_name.trim() ? (
                <>
                  {t("footer.entity")} <b>{formData.full_name.trim()}</b>
                </>
              ) : (
                <>{t("footer.enterName")}</>
              )}
              <span className="ml-3 text-gray-400">{t("footer.shortcuts")}</span>
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={attemptClose} disabled={isSubmitting || isDetailLoading}>
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isSaveDisabled}>
                {isSubmitting ? t("btn.saving", { defaultValue: "Saving..." }) : t("btn.save")}
              </Button>
            </div>
          </footer>
        </form>

        {/* Close confirm overlay */}
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
                  {t("confirmDiscard.title")}
                </h2>
                <p id="close-confirm-desc" className="mt-1 text-[12px] text-gray-600">
                  {t("confirmDiscard.message")}
                </p>
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
                    const wrap = warning.focusWrapId;
                    setWarning(null);
                    setTimeout(() => {
                      if (wrap) focusFirstInteractive(wrap);
                      else fullNameRef.current?.focus();
                    }, 0);
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

export default EntityModal;

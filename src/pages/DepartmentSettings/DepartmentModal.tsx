/* -------------------------------------------------------------------------- */
/* File: src/pages/DepartmentSettings/DepartmentModal.tsx                      */
/* Design: aligned to EntriesModal (header/body/footer + overlays)             */
/* i18n: namespace "departmentSettings"                                       */
/* Tabs: none                                                                  */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
import Shimmer from "@/shared/ui/Loaders/Shimmer";

import { api } from "@/api/requests";

import type { Department } from "@/models/settings/departments";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type Mode = "create" | "edit";

type FormState = { name: string; code: string; is_active: boolean };
const emptyForm: FormState = { name: "", code: "", is_active: true };

export type DepartmentModalProps = {
  isOpen: boolean;
  mode: Mode;
  department?: Department | null;

  onClose: () => void;
  onNotify?: (snack: Snack) => void;
  onSaved?: (result: { mode: Mode; created?: Department }) => void;
};

const ModalSkeleton: React.FC = () => (
  <div className="space-y-3 py-1">
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <div className="flex justify-end gap-2 pt-1">
      <Shimmer className="h-9 w-24 rounded-md" />
      <Shimmer className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

function normalizeComparable(form: FormState) {
  const trim = (v: string) => (v ?? "").trim();
  return {
    name: trim(form.name),
    code: trim(form.code),
    is_active: !!form.is_active,
  };
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  mode,
  department,
  onClose,
  onNotify,
  onSaved,
}) => {
  const { t } = useTranslation("departmentSettings");

  const departmentId = department?.id ?? null;

  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef<string>(JSON.stringify(normalizeComparable(emptyForm)));

  const title = useMemo(() => {
    return mode === "create" ? t("modal.createTitle") : t("modal.editTitle");
  }, [mode, t]);

  const badge = "DP";

  const isDirty = useMemo(() => {
    const now = JSON.stringify(normalizeComparable(formData));
    return now !== baselineRef.current;
  }, [formData]);

  const isSaveDisabled = useMemo(() => {
    if (isSubmitting || isDetailLoading) return true;
    if (!formData.name.trim()) return true;
    return false;
  }, [isSubmitting, isDetailLoading, formData.name]);

  const resetInternalState = useCallback(() => {
    setFormData(emptyForm);
    setIsDetailLoading(false);
    setIsSubmitting(false);
    setShowCloseConfirm(false);
    setWarning(null);
    baselineRef.current = JSON.stringify(normalizeComparable(emptyForm));
  }, []);

  const handleClose = useCallback(() => {
    resetInternalState();
    onClose();
  }, [onClose, resetInternalState]);

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
  }, [handleClose, isDirty, showCloseConfirm, warning]);

  /* ------------------------------ Load detail on open ------------------------------ */
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      resetInternalState();

      if (mode === "create") {
        setTimeout(() => nameRef.current?.focus(), 60);
        return;
      }

      if (!departmentId) return;

      setIsDetailLoading(true);

      try {
        const res = await api.getDepartment(departmentId);
        const detail = res.data as Department;
        if (!alive) return;

        const next: FormState = {
          name: detail.name ?? "",
          code: detail.code ?? "",
          is_active: detail.is_active ?? true,
        };

        setFormData(next);
        baselineRef.current = JSON.stringify(normalizeComparable(next));
        setTimeout(() => nameRef.current?.focus(), 60);
      } catch {
        if (!alive) return;

        const fallback: FormState = {
          name: department?.name ?? "",
          code: department?.code ?? "",
          is_active: department?.is_active ?? true,
        };

        setFormData(fallback);
        baselineRef.current = JSON.stringify(normalizeComparable(fallback));
        onNotify?.({ message: t("errors.fetchError"), severity: "error" });
        setTimeout(() => nameRef.current?.focus(), 60);
      } finally {
        if (alive) setIsDetailLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, mode, departmentId, resetInternalState, onNotify, t, department]);

  /* ------------------------------ Body scroll lock ------------------------------ */
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* ------------------------------ Keyboard: ESC, Ctrl/⌘+S ------------------------------ */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        (document.getElementById("departmentModalForm") as HTMLFormElement | null)?.requestSubmit();
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose]);

  window.useGlobalEsc(isOpen, onClose);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = formData.name.trim();
      if (!trimmedName) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationName") });
        return;
      }

      const payload = {
        name: trimmedName,
        code: (formData.code ?? "").trim(),
        is_active: !!formData.is_active,
      };

      setIsSubmitting(true);

      try {
        if (mode === "create") {
          const { data: created } = await api.addDepartment(payload);
          onNotify?.({ message: t("toast.saveOk"), severity: "success" });
          onSaved?.({ mode: "create", created: created as Department });
          handleClose();
          return;
        }

        if (!departmentId) return;

        await api.editDepartment(departmentId, payload);
        onNotify?.({ message: t("toast.saveOk"), severity: "success" });
        onSaved?.({ mode: "edit" });
        handleClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("errors.saveFailed");
        onNotify?.({ message: msg, severity: "error" });
        setWarning({ title: t("errors.saveFailed"), message: msg });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, mode, departmentId, onNotify, onSaved, handleClose, t]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-[780px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {badge}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("card.settings")}</div>
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
        <form id="departmentModalForm" className="flex-1 flex flex-col" onSubmit={submit}>
          <div className="relative z-10 px-5 py-4 overflow-visible flex-1">
            {mode === "edit" && isDetailLoading ? (
              <ModalSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  kind="text"
                  ref={nameRef}
                  label={t("modal.fields.name")}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting || isDetailLoading}
                />

                <Input
                  kind="text"
                  label={t("modal.fields.code")}
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={isSubmitting || isDetailLoading}
                />

                <label className="flex items-center gap-2 text-sm pt-6">
                  <Checkbox
                    checked={!!formData.is_active}
                    onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                    disabled={isSubmitting || isDetailLoading}
                  />
                  {t("modal.fields.is_active")}
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {formData.name.trim() ? (
                <>
                  {t("footer.department")} <b>{formData.name.trim()}</b>
                </>
              ) : (
                <>{t("footer.enterName")}</>
              )}
              <span className="ml-3 text-gray-400">{t("footer.shortcuts")}</span>
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={attemptClose} disabled={isSubmitting || isDetailLoading}>
                {t("buttons.cancel")}
              </Button>
              <Button type="submit" disabled={isSaveDisabled}>
                {t("buttons.save")}
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
                  {t("buttons.cancel")}
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
                    setWarning(null);
                    setTimeout(() => nameRef.current?.focus(), 0);
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

export default DepartmentModal;

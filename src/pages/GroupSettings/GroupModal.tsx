/* -------------------------------------------------------------------------- */
/* File: src/pages/GroupSettings/GroupModal.tsx                                */
/* i18n: namespace "groupSettings"                                            */
/* Modal: create/rename only (no tabs)                                        */
/* UX: Esc close • Ctrl/⌘+S save • discard confirm if dirty                   */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Shimmer from "@/shared/ui/Loaders/Shimmer";

type Mode = "create" | "rename";

export type GroupModalProps = {
  isOpen: boolean;
  mode: Mode;

  initialName?: string;
  busy?: boolean;

  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
};

const ModalSkeleton: React.FC = () => (
  <div className="space-y-3 py-1">
    <Shimmer className="h-10 rounded-md" />
    <div className="flex justify-end gap-2 pt-1">
      <Shimmer className="h-9 w-24 rounded-md" />
      <Shimmer className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

const GroupModal: React.FC<GroupModalProps> = ({ isOpen, mode, initialName = "", busy = false, onClose, onSubmit }) => {
  const { t } = useTranslation("groupSettings");

  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);

  const baselineRef = useRef<string>(initialName.trim());

  const effectiveBusy = busy || isSubmitting;

  const title = useMemo(() => {
    return mode === "create" ? t("modal.createTitle") : t("modal.renameTitle");
  }, [mode, t]);

  const label = useMemo(() => {
    return mode === "create" ? t("modal.nameLabelCreate") : t("modal.nameLabelRename");
  }, [mode, t]);

  const isDirty = useMemo(() => name.trim() !== baselineRef.current, [name]);

  const resetState = useCallback(() => {
    setName(initialName);
    baselineRef.current = initialName.trim();
    setIsSubmitting(false);
    setShowCloseConfirm(false);
    setWarning(null);
  }, [initialName]);

  const hardClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

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
    hardClose();
  }, [hardClose, isDirty, showCloseConfirm, warning]);

  useEffect(() => {
    if (!isOpen) return;
    resetState();

    // focus after open paint
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [isOpen, resetState]);

  /* lock body scroll */
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* keyboard shortcuts */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        (document.getElementById("groupModalForm") as HTMLFormElement | null)?.requestSubmit();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose]);

  window.useGlobalEsc(isOpen, onClose);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (effectiveBusy) return;

      const trimmed = name.trim();
      if (!trimmed) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationNameRequired") });
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(trimmed);
        hardClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("errors.submitFailed");
        setWarning({ title: t("errors.submitFailed"), message: msg });
      } finally {
        setIsSubmitting(false);
      }
    },
    [effectiveBusy, name, onSubmit, hardClose, t]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-[720px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                GR
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                <h2 className="text-[16px] font-semibold text-gray-900 leading-snug truncate">{title}</h2>
              </div>
            </div>

            <button
              className="text-[20px] text-gray-400 hover:text-gray-700 leading-none disabled:opacity-50"
              onClick={attemptClose}
              aria-label={t("modal.close")}
              disabled={effectiveBusy}
            >
              &times;
            </button>
          </div>
        </header>

        {/* Body */}
        <form id="groupModalForm" className="flex-1 flex flex-col" onSubmit={submit}>
          <div className="px-5 py-4 flex-1">
            {effectiveBusy && mode === "rename" ? (
              <ModalSkeleton />
            ) : (
              <Input
                kind="text"
                label={label}
                name="groupName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={effectiveBusy}
                required
                ref={inputRef}
              />
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {t("modal.shortcuts")}
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={attemptClose} disabled={effectiveBusy}>
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={effectiveBusy || !name.trim()}>
                {t("btn.save")}
              </Button>
            </div>
          </footer>
        </form>

        {/* Discard confirm overlay */}
        {showCloseConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4" role="alertdialog">
            <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-900">{t("confirmDiscard.title")}</h3>
                <p className="mt-1 text-[12px] text-gray-600">{t("confirmDiscard.message")}</p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
                  {t("btn.cancel")}
                </Button>
                <Button variant="danger" className="!bg-red-500 hover:!bg-red-600" onClick={hardClose}>
                  {t("actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Warning overlay */}
        {warning && (
          <div className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-center justify-center p-4" role="alertdialog">
            <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h3 className="text-[15px] font-semibold text-amber-800">{warning.title}</h3>
                <p className="mt-1 text-[12px] text-amber-700">{warning.message}</p>
              </div>
              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setWarning(null);
                    setTimeout(() => inputRef.current?.focus(), 0);
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

export default GroupModal;

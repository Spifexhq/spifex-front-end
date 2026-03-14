/* -------------------------------------------------------------------------- */
/* File: src/pages/GroupSettings/GroupModal.tsx                               */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

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

const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  mode,
  initialName = "",
  busy = false,
  onClose,
  onSubmit,
}) => {
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
    if (effectiveBusy) return;

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
  }, [effectiveBusy, warning, showCloseConfirm, isDirty, hardClose]);

  useEffect(() => {
    if (!isOpen) return;

    resetState();

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isOpen]);

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
        (document.getElementById("groupModalForm") as HTMLFormElement | null)?.requestSubmit();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (effectiveBusy) return;

      const trimmed = name.trim();

      if (!trimmed) {
        setWarning({
          title: t("errors.validationTitle"),
          message: t("errors.validationNameRequired"),
        });
        return;
      }

      setIsSubmitting(true);

      try {
        await onSubmit(trimmed);
        hardClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : t("errors.submitFailed");
        setWarning({
          title: t("errors.submitFailed"),
          message,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [effectiveBusy, name, onSubmit, hardClose, t]
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
        aria-labelledby="group-modal-title"
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

        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shrink-0">
          <div className="px-4 md:px-5 pt-2 md:pt-4 pb-3 md:pb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700 shrink-0">
                GR
              </div>

              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("header.settings")}
                </div>
                <h2
                  id="group-modal-title"
                  className="text-[16px] font-semibold text-gray-900 leading-snug truncate"
                >
                  {title}
                </h2>
              </div>
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center disabled:opacity-50 shrink-0"
              onClick={attemptClose}
              aria-label={t("modal.close")}
              disabled={effectiveBusy}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <form
          id="groupModalForm"
          className="flex flex-1 min-h-0 flex-col md:block md:flex-none"
          onSubmit={submit}
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:block md:max-h-none md:overflow-visible md:px-5">
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

          <footer
            className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 shrink-0 md:static md:px-5"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-[12px] text-gray-600 hidden md:block">{t("modal.shortcuts")}</p>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:ml-auto">
                <Button
                  variant="cancel"
                  type="button"
                  onClick={attemptClose}
                  disabled={effectiveBusy}
                  className="w-full md:w-auto"
                >
                  {t("btn.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={effectiveBusy || !name.trim()}
                  className="w-full md:w-auto"
                >
                  {t("btn.save")}
                </Button>
              </div>
            </div>
          </footer>
        </form>

        {showCloseConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-900">{t("confirmDiscard.title")}</h3>
                <p className="mt-1 text-[12px] text-gray-600">{t("confirmDiscard.message")}</p>
              </div>

              <div
                className="px-5 py-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button variant="outline" onClick={() => setShowCloseConfirm(false)} className="w-full md:w-auto">
                  {t("btn.cancel")}
                </Button>
                <Button
                  variant="danger"
                  className="w-full md:w-auto !bg-red-500 hover:!bg-red-600"
                  onClick={hardClose}
                >
                  {t("actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {warning && (
          <div className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h3 className="text-[15px] font-semibold text-amber-800">{warning.title}</h3>
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
                    requestAnimationFrame(() => inputRef.current?.focus());
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
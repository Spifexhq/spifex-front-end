/* -------------------------------------------------------------------------- */
/* File: src/pages/MemberSettings/MemberModal.tsx                             */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Shimmer from "@/shared/ui/Loaders/Shimmer";
import { Select } from "src/shared/ui/Select";

import { api } from "@/api/requests";
import { PermissionMiddleware } from "src/middlewares";
import { validatePassword } from "@/lib";

import type { GroupListItem } from "@/models/auth/rbac";
import type { Member } from "@/models/auth/members";

type Mode = "create" | "edit";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  groups: GroupListItem[];
};

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  groups: [],
};

function normalizeComparable(form: FormState) {
  const trim = (value: string) => (value ?? "").trim();
  const groupIds = (form.groups ?? [])
    .map((group) => group.id)
    .slice()
    .sort();

  return {
    name: trim(form.name),
    email: trim(form.email),
    password: form.password,
    confirmPassword: form.confirmPassword,
    groupIds,
  };
}

const ModalSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <div className="md:col-span-2">
      <Shimmer className="h-10 rounded-md" />
    </div>
    <div className="md:col-span-2 flex justify-end gap-3 pt-1">
      <Shimmer className="h-9 w-24 rounded-md" />
      <Shimmer className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

export type MemberModalProps = {
  isOpen: boolean;
  mode: Mode;
  member?: Member | null;
  allGroups: GroupListItem[];
  onClose: () => void;
  onNotify?: (snack: Snack) => void;
  onSaved?: (res: { mode: Mode; memberId?: string }) => void;
};

const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  mode,
  member,
  allGroups,
  onClose,
  onNotify,
  onSaved,
}) => {
  const { t } = useTranslation("memberSettings");

  const memberId = member?.id ?? null;

  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);

  const baselineRef = useRef<string>(JSON.stringify(normalizeComparable(emptyForm)));
  const nameRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const title = mode === "create" ? t("modal.createTitle") : t("modal.editTitle");

  const isDirty = useMemo(() => {
    return JSON.stringify(normalizeComparable(formData)) !== baselineRef.current;
  }, [formData]);

  const busy = isSubmitting || isDetailLoading;
  const disableForm = busy;

  const requiredFilled = useMemo(() => {
    const nameOk = formData.name.trim().length > 0;
    const emailOk = formData.email.trim().length > 0;

    if (mode === "create") {
      const passwordOk = formData.password.trim().length > 0;
      const confirmPasswordOk = formData.confirmPassword.trim().length > 0;
      return nameOk && emailOk && passwordOk && confirmPasswordOk;
    }

    return nameOk && emailOk;
  }, [formData, mode]);

  const canSubmit = !busy && requiredFilled;

  const hardReset = useCallback(() => {
    setFormData(emptyForm);
    setIsDetailLoading(false);
    setIsSubmitting(false);
    setShowDiscardConfirm(false);
    setWarning(null);
    baselineRef.current = JSON.stringify(normalizeComparable(emptyForm));
  }, []);

  const closeNow = useCallback(() => {
    hardReset();
    onClose();
  }, [hardReset, onClose]);

  const attemptClose = useCallback(() => {
    if (busy) return;

    if (warning) {
      setWarning(null);
      return;
    }

    if (showDiscardConfirm) return;

    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }

    closeNow();
  }, [busy, warning, showDiscardConfirm, isDirty, closeNow]);

  const focusNameInput = useCallback(() => {
    requestAnimationFrame(() => {
      nameRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    const run = async () => {
      hardReset();

      if (mode === "create") {
        focusNameInput();
        return;
      }

      if (!memberId) return;

      setIsDetailLoading(true);

      try {
        const response = await api.getMember(memberId);
        const detail = response.data.member as Member;

        if (!alive) return;

        const next: FormState = {
          name: detail.name ?? "",
          email: detail.email ?? "",
          password: "",
          confirmPassword: "",
          groups: ((detail as unknown as { groups?: GroupListItem[] }).groups ?? []) as GroupListItem[],
        };

        setFormData(next);
        baselineRef.current = JSON.stringify(normalizeComparable(next));
        focusNameInput();
      } catch {
        if (!alive) return;
        onNotify?.({ message: t("errors.loadMemberError"), severity: "error" });
        closeNow();
      } finally {
        if (alive) setIsDetailLoading(false);
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, [isOpen, mode, memberId, hardReset, onNotify, t, closeNow, focusNameInput]);

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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        attemptClose();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (canSubmit) {
          (document.getElementById("memberModalForm") as HTMLFormElement | null)?.requestSubmit();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose, canSubmit]);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const name = formData.name.trim();
      const email = formData.email.trim();

      if (!name || !email) {
        setWarning({
          title: t("errors.validationTitle"),
          message: t("errors.validationRequired"),
        });
        return;
      }

      if (mode === "create") {
        if (formData.password !== formData.confirmPassword) {
          const message = t("toast.passwordMismatch");
          onNotify?.({ message, severity: "warning" });
          setWarning({ title: t("errors.validationTitle"), message });
          return;
        }

        const { isValid, message } = validatePassword(formData.password);
        if (!isValid) {
          const warningMessage = (message as string | undefined) || t("toast.weakPassword");
          onNotify?.({ message: warningMessage, severity: "warning" });
          setWarning({
            title: t("errors.validationTitle"),
            message: warningMessage,
          });
          return;
        }
      }

      const group_ids = (formData.groups ?? []).map((group) => group.id);

      setIsSubmitting(true);

      try {
        if (mode === "create") {
          await api.addMember({
            name,
            email,
            password: formData.password || undefined,
            group_ids,
          });
        } else if (memberId) {
          await api.editMember(memberId, {
            name,
            email,
            group_ids,
          });
        }

        onNotify?.({ message: t("toast.saveOk"), severity: "success" });
        onSaved?.({ mode, memberId: memberId ?? undefined });
        closeNow();
      } catch {
        onNotify?.({ message: t("errors.saveError"), severity: "error" });
        setWarning({
          title: t("errors.saveErrorTitle"),
          message: t("errors.saveError"),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, mode, memberId, onNotify, onSaved, closeNow, t]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 md:grid md:place-items-center" >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-modal-title"
        className={[
          "relative bg-white shadow-2xl flex flex-col w-full",
          "h-[100dvh] max-h-[100dvh]",
          "rounded-none border-0",
          "fixed inset-x-0 bottom-0",
          "md:static md:w-[860px] md:max-w-[95vw]",
          "md:h-auto md:max-h-[calc(100vh-4rem)]",
          "md:rounded-lg md:border md:border-gray-200",
        ].join(" ")}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <header className="border-b border-gray-200 bg-white shrink-0">
          <div className="px-4 md:px-5 pt-2 md:pt-4 pb-3 md:pb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700 shrink-0">
                FN
              </div>

              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("header.settings")}
                </div>
                <h1
                  id="member-modal-title"
                  className="text-[16px] font-semibold text-gray-900 leading-snug truncate"
                >
                  {title}
                </h1>
              </div>
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center disabled:opacity-50 shrink-0"
              onClick={attemptClose}
              aria-label={t("modal.close")}
              disabled={busy}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <form
          id="memberModalForm"
          className="flex flex-1 min-h-0 flex-col md:block md:flex-none"
          onSubmit={submit}
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:block md:max-h-none md:overflow-visible md:px-5">
            {mode === "edit" && isDetailLoading ? (
              <ModalSkeleton />
            ) : (
              <div
                className={[
                  "grid grid-cols-1 md:grid-cols-2 gap-4",
                  disableForm ? "opacity-70 pointer-events-none" : "",
                ].join(" ")}
              >
                <Input
                  kind="text"
                  label={t("field.name")}
                  name="name"
                  ref={nameRef}
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />

                <Input
                  kind="text"
                  label={t("field.email")}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />

                {mode === "create" && (
                  <>
                    <Input
                      kind="text"
                      label={t("field.tempPassword")}
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      showTogglePassword
                      required
                    />

                    <Input
                      kind="text"
                      label={t("field.confirmPassword")}
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      showTogglePassword
                      required
                    />
                  </>
                )}

                <PermissionMiddleware codeName={"view_group"}>
                  <div className="md:col-span-2">
                    <Select<GroupListItem>
                      label={t("field.groups")}
                      items={allGroups}
                      selected={formData.groups}
                      onChange={(items) => setFormData((prev) => ({ ...prev, groups: items }))}
                      getItemKey={(group) => group.id}
                      getItemLabel={(group) => group.name}
                      buttonLabel={t("btnLabel.groups")}
                      hideCheckboxes={false}
                      clearOnClickOutside={false}
                      customStyles={{ maxHeight: "280px" }}
                    />
                  </div>
                </PermissionMiddleware>
              </div>
            )}
          </div>

          <footer
            className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 md:px-5"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-[12px] text-gray-600 hidden md:block">{t("footer.shortcuts")}</p>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:ml-auto">
                <Button
                  variant="cancel"
                  type="button"
                  onClick={attemptClose}
                  disabled={busy}
                  className="w-full md:w-auto"
                >
                  {t("btn.cancel")}
                </Button>

                <Button type="submit" disabled={!canSubmit} className="w-full md:w-auto">
                  {t("btn.save")}
                </Button>
              </div>
            </div>
          </footer>
        </form>

        {showDiscardConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-gray-900">{t("confirmDiscard.title")}</h2>
                <p className="mt-1 text-[12px] text-gray-600">{t("confirmDiscard.message")}</p>
              </div>

              <div
                className="px-5 py-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="outline"
                  className="w-full md:w-auto !border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  {t("btn.cancel")}
                </Button>

                <Button
                  variant="danger"
                  className="w-full md:w-auto !bg-red-500 hover:!bg-red-600"
                  onClick={closeNow}
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
                    focusNameInput();
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

export default MemberModal;
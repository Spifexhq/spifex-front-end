/* -------------------------------------------------------------------------- */
/* File: src/pages/MemberSettings/MemberModal.tsx                              */
/* - No tabs                                                                   */
/* - Owns: detail fetch (edit), create/edit submit, password validation        */
/* - i18n: namespace "memberSettings"                                         */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "src/components/ui/Input";
import Button from "@/components/ui/Button";
import Shimmer from "@/components/ui/Loaders/Shimmer";
import { SelectDropdown } from "@/components/ui/SelectDropdown";

import { api } from "@/api/requests";
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

function normalizeComparable(f: FormState) {
  const trim = (v: string) => (v ?? "").trim();
  const groupIds = (f.groups ?? []).map((g) => g.id).slice().sort();
  return {
    name: trim(f.name),
    email: trim(f.email),
    password: f.password, // keep as-is (user input)
    confirmPassword: f.confirmPassword,
    groupIds,
  };
}

const ModalSkeleton: React.FC = () => (
  <div className="py-1 grid grid-cols-2 gap-4">
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <div className="col-span-2">
      <Shimmer className="h-10 rounded-md" />
    </div>
    <div className="col-span-2 flex justify-end gap-3 pt-1">
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
  canEdit?: boolean;

  onClose: () => void;
  onNotify?: (snack: Snack) => void;
  onSaved?: (res: { mode: Mode; memberId?: string }) => void;
};

const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  mode,
  member,
  allGroups,
  canEdit = true,
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

  const title = mode === "create" ? t("modal.createTitle") : t("modal.editTitle");

  const isDirty = useMemo(() => {
    const now = JSON.stringify(normalizeComparable(formData));
    return now !== baselineRef.current;
  }, [formData]);

  const busy = isSubmitting || isDetailLoading;
  const disableForm = busy || !canEdit;

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
  }, [warning, showDiscardConfirm, isDirty, closeNow]);

  /* ----------------------- load detail on open (edit) ---------------------- */
  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      hardReset();

      if (mode === "create") {
        setTimeout(() => nameRef.current?.focus(), 80);
        return;
      }

      if (!memberId) return;

      setIsDetailLoading(true);
      try {
        const res = await api.getMember(memberId);
        const detail = res.data.member as Member;

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
        setTimeout(() => nameRef.current?.focus(), 80);
      } catch {
        if (!alive) return;

        onNotify?.({ message: t("errors.loadMemberError"), severity: "error" });
        closeNow();
      } finally {
        if (alive) setIsDetailLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, mode, memberId, hardReset, onNotify, t, closeNow]);

  /* --------------------------- body scroll lock ---------------------------- */
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* ---------------------- keyboard: ESC, Ctrl/⌘+S -------------------------- */
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
        (document.getElementById("memberModalForm") as HTMLFormElement | null)?.requestSubmit();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose]);

  /* ------------------------------ submit ---------------------------------- */
  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canEdit) return;

      const name = formData.name.trim();
      const email = formData.email.trim();

      if (!name || !email) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationRequired") });
        return;
      }

      if (mode === "create") {
        if (formData.password !== formData.confirmPassword) {
          onNotify?.({ message: t("toast.passwordMismatch"), severity: "warning" });
          setWarning({ title: t("errors.validationTitle"), message: t("toast.passwordMismatch") });
          return;
        }

        const { isValid, message } = validatePassword(formData.password);
        if (!isValid) {
          const msg = (message as string | undefined) || t("toast.weakPassword");
          onNotify?.({ message: msg, severity: "warning" });
          setWarning({ title: t("errors.validationTitle"), message: msg });
          return;
        }
      }

      const group_ids = (formData.groups ?? []).map((g) => g.id);

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
        setWarning({ title: t("errors.saveErrorTitle"), message: t("errors.saveError") });
      } finally {
        setIsSubmitting(false);
      }
    },
    [canEdit, formData, mode, memberId, onNotify, onSaved, closeNow, t]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] grid place-items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-[860px] max-w-[95vw] max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                FN
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
              disabled={busy}
            >
              &times;
            </button>
          </div>
        </header>

        {/* Body */}
        <form id="memberModalForm" className="flex-1 flex flex-col" onSubmit={submit}>
          <div className="px-5 py-4 flex-1">
            {mode === "edit" && isDetailLoading ? (
              <ModalSkeleton />
            ) : (
              <div className={`grid grid-cols-2 gap-4 ${disableForm ? "opacity-70 pointer-events-none" : ""}`}>
                <Input
                  kind="text"
                  label={t("field.name")}
                  name="name"
                  ref={nameRef}
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                />

                <Input
                  kind="text"
                  label={t("field.email")}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
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
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      showTogglePassword
                      required
                    />
                    <Input
                      kind="text"
                      label={t("field.confirmPassword")}
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                      showTogglePassword
                      required
                    />
                  </>
                )}

                <div className="col-span-1">
                  <SelectDropdown<GroupListItem>
                    label={t("field.groups")}
                    items={allGroups}
                    selected={formData.groups}
                    onChange={(items) => setFormData((p) => ({ ...p, groups: items }))}
                    getItemKey={(g) => g.id}
                    getItemLabel={(g) => g.name}
                    buttonLabel={t("btnLabel.groups")}
                    hideCheckboxes={false}
                    clearOnClickOutside={false}
                    customStyles={{ maxHeight: "280px" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
            <p className="text-[12px] text-gray-600">
              {t("footer.shortcuts")}
            </p>

            <div className="flex gap-2">
              <Button variant="cancel" type="button" onClick={attemptClose} disabled={busy}>
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={busy || !canEdit}>
                {t("btn.save")}
              </Button>
            </div>
          </footer>
        </form>

        {/* Discard changes overlay */}
        {showDiscardConfirm && (
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
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  {t("btn.cancel")}
                </Button>
                <Button variant="danger" className="!bg-red-500 hover:!bg-red-600" onClick={closeNow}>
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

export default MemberModal;

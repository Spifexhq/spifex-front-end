import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";

type ModalMode = "password" | "email" | "twofactor" | null;

type PasswordData = {
  current_password: string;
  new_password: string;
  confirm: string;
};

type EmailData = {
  current_email: string;
  new_email: string;
  current_password: string;
};

type TwoFactorConfirmData = {
  email: string;
  password: string;
};

type SecurityAndPrivacyModalProps = {
  isOpen: boolean;
  modalMode: ModalMode;
  isSubmitting: boolean;
  isTwoFactorSubmitting: boolean;
  pwData: PasswordData;
  emailData: EmailData;
  twoFactorConfirm: TwoFactorConfirmData;
  twoFactorIntentEnabled: boolean | null;

  pwValidation: { isValid: boolean; message?: React.ReactNode };
  pwMismatch: boolean;
  pwSameAsCurrent: boolean;
  canSubmitPassword: boolean;
  canSubmitEmail: boolean;

  onClose: () => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTwoFactorConfirmChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordSubmit: () => void | Promise<void>;
  onEmailSubmit: () => void | Promise<void>;
  onTwoFactorSubmit: () => void | Promise<void>;
};

const SecurityAndPrivacyModal: React.FC<SecurityAndPrivacyModalProps> = ({
  isOpen,
  modalMode,
  isSubmitting,
  isTwoFactorSubmitting,
  pwData,
  emailData,
  twoFactorConfirm,
  twoFactorIntentEnabled,
  pwValidation,
  pwMismatch,
  pwSameAsCurrent,
  canSubmitPassword,
  canSubmitEmail,
  onClose,
  onPasswordChange,
  onEmailChange,
  onTwoFactorConfirmChange,
  onPasswordSubmit,
  onEmailSubmit,
  onTwoFactorSubmit,
}) => {
  const { t } = useTranslation("securityAndPrivacy");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const isBusy = isSubmitting || isTwoFactorSubmitting;

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
        if (!isBusy) onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isBusy, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
    });
  }, [isOpen, modalMode]);

  const title = useMemo(() => {
    if (modalMode === "password") return t("modal.title");
    if (modalMode === "email") return t("modal.emailTitle");
    return twoFactorIntentEnabled ? t("modal.twoFactorEnableTitle") : t("modal.twoFactorDisableTitle");
  }, [modalMode, twoFactorIntentEnabled, t]);

  const submitDisabled =
    isBusy ||
    (modalMode === "password"
      ? !canSubmitPassword
      : modalMode === "email"
      ? !canSubmitEmail
      : !twoFactorConfirm.email || !twoFactorConfirm.password || twoFactorIntentEnabled === null);

  if (!isOpen || !modalMode) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 md:grid md:place-items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-and-privacy-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className={[
          "relative bg-white shadow-2xl flex flex-col w-full overflow-hidden",
          "h-[100dvh] max-h-[100dvh] rounded-none border-0 fixed inset-x-0 bottom-0",
          "md:static md:w-[640px] md:max-w-[95vw] md:h-auto md:max-h-[calc(100vh-4rem)]",
          "md:rounded-lg md:border md:border-gray-200",
        ].join(" ")}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        <header className="border-b border-gray-200 bg-white shrink-0">
          <div className="px-4 md:px-5 pt-2 md:pt-4 pb-3 md:pb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
              <h3
                id="security-and-privacy-modal-title"
                className="text-[16px] font-semibold text-gray-900 leading-snug truncate"
              >
                {title}
              </h3>
            </div>

            <button
              type="button"
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center disabled:opacity-50 shrink-0"
              onClick={onClose}
              aria-label={t("modal.close")}
              disabled={isBusy}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <form
          className="flex flex-1 min-h-0 flex-col md:block md:flex-none"
          onSubmit={(e) => {
            e.preventDefault();
            if (modalMode === "password") void onPasswordSubmit();
            else if (modalMode === "email") void onEmailSubmit();
            else void onTwoFactorSubmit();
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:block md:max-h-none md:overflow-visible md:px-5">
            <div className={`space-y-3 ${isBusy ? "opacity-70 pointer-events-none" : ""}`}>
              {modalMode === "password" ? (
                <>
                  <Input
                    ref={firstFieldRef}
                    kind="text"
                    label={t("field.current")}
                    name="current_password"
                    type="password"
                    value={pwData.current_password}
                    onChange={onPasswordChange}
                    showTogglePassword
                    autoComplete="current-password"
                    required
                  />

                  <Input
                    kind="text"
                    label={t("field.new")}
                    name="new_password"
                    type="password"
                    value={pwData.new_password}
                    onChange={onPasswordChange}
                    showTogglePassword
                    autoComplete="new-password"
                    required
                  />

                  {pwData.new_password && !pwValidation.isValid && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                      {pwValidation.message ? (
                        <div className="text-[12px] text-gray-800">{pwValidation.message}</div>
                      ) : (
                        <div className="text-[12px] text-gray-800">{t("toast.weakPassword")}</div>
                      )}
                    </div>
                  )}

                  {pwSameAsCurrent && <p className="text-[12px] text-red-600">{t("toast.samePassword")}</p>}

                  <Input
                    kind="text"
                    label={t("field.confirm")}
                    name="confirm"
                    type="password"
                    value={pwData.confirm}
                    onChange={onPasswordChange}
                    showTogglePassword
                    autoComplete="new-password"
                    required
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    onDragOver={(e) => e.preventDefault()}
                  />

                  {pwMismatch && <p className="text-[12px] text-red-600">{t("toast.passwordMismatch")}</p>}
                </>
              ) : modalMode === "email" ? (
                <>
                  <Input
                    ref={firstFieldRef}
                    kind="text"
                    label={t("field.currentEmail")}
                    name="current_email"
                    type="email"
                    value={emailData.current_email}
                    onChange={onEmailChange}
                    autoComplete="email"
                    required
                  />

                  <Input
                    kind="text"
                    label={t("field.newEmail")}
                    name="new_email"
                    type="email"
                    value={emailData.new_email}
                    onChange={onEmailChange}
                    autoComplete="email"
                    required
                  />

                  <Input
                    kind="text"
                    label={t("field.currentPassword")}
                    name="current_password"
                    type="password"
                    value={emailData.current_password}
                    onChange={onEmailChange}
                    showTogglePassword
                    autoComplete="current-password"
                    required
                  />
                </>
              ) : (
                <>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="text-[12px] text-gray-800">
                      {twoFactorIntentEnabled ? t("modal.twoFactorEnableHelp") : t("modal.twoFactorDisableHelp")}
                    </div>
                  </div>

                  <Input
                    ref={firstFieldRef}
                    kind="text"
                    label={t("field.confirmEmail")}
                    name="email"
                    type="email"
                    value={twoFactorConfirm.email}
                    onChange={onTwoFactorConfirmChange}
                    autoComplete="email"
                    required
                  />

                  <Input
                    kind="text"
                    label={t("field.currentPassword")}
                    name="password"
                    type="password"
                    value={twoFactorConfirm.password}
                    onChange={onTwoFactorConfirmChange}
                    showTogglePassword
                    autoComplete="current-password"
                    required
                  />
                </>
              )}
            </div>
          </div>

          <footer
            className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 md:px-5"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
              <Button
                variant="cancel"
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="w-full md:w-auto"
              >
                {t("btn.cancel")}
              </Button>

              <Button type="submit" disabled={submitDisabled} className="w-full md:w-auto">
                {modalMode === "password"
                  ? t("btn.save")
                  : modalMode === "email"
                  ? t("btn.saveEmail")
                  : t("btn.confirm")}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default SecurityAndPrivacyModal;
import SidePanel, { SidePanelFooter } from "@/components/Modal/SidePanel";

import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

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

  return (
    <SidePanel mode="edit" isOpen={isOpen && !!modalMode} title={<>{title}</>} onClose={onClose} busy={isBusy}>



        <form
          className="settings-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (modalMode === "password") void onPasswordSubmit();
            else if (modalMode === "email") void onEmailSubmit();
            else void onTwoFactorSubmit();
          }}
        >
          <div className="settings-modal-scroll">
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

          <SidePanelFooter
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
          </SidePanelFooter>
        </form>
      </SidePanel>
  );
};

export default SecurityAndPrivacyModal;

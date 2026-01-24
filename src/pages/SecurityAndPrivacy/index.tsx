/* --------------------------------------------------------------------------
 * File: src/pages/SecurityAndPrivacy.tsx
 * -------------------------------------------------------------------------- */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR, enUS, fr, de } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import Checkbox from "@/shared/ui/Checkbox";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { validatePassword } from "@/lib";
import type { ApiErrorBody } from "@/models/Api";
import type { SecurityStatusResponse } from "@/models/auth/security";

/* ------------------------------- Types ----------------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* -------------------------------- Helpers -------------------------------- */
function getInitials(name?: string) {
  if (!name) return "SC";
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

const Row = ({
  label,
  value,
  action,
  disabled,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
  disabled?: boolean;
}) => (
  <div
    className={`flex items-center justify-between px-4 py-2.5 ${
      disabled ? "opacity-70 pointer-events-none" : ""
    }`}
  >
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value}</p>
    </div>
    {action}
  </div>
);

/**
 * Type guard for ApiErrorBody thrown by our `request<T>` helper.
 */
const isApiErrorBody = (value: unknown): value is ApiErrorBody => {
  return typeof value === "object" && value !== null && "code" in value;
};

/**
 * Try to extract a human-readable message from ApiErrorBody
 * (message, detail, or detail.detail).
 */
const getApiErrorMessage = (error: ApiErrorBody): string | undefined => {
  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  const detail = error.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (
    detail &&
    typeof detail === "object" &&
    "detail" in detail &&
    typeof (detail as { detail: unknown }).detail === "string"
  ) {
    const inner = (detail as { detail: string }).detail;
    if (inner.trim()) return inner;
  }

  return undefined;
};

/* -------------------------------------------------------------------------- */
const SecurityAndPrivacy: React.FC = () => {
  const { t, i18n } = useTranslation("securityAndPrivacy");
  const { user: authUser } = useAuthContext();

  /* ----------------------------- Title + lang ------------------------------ */
  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ----------------------------- date-fns locale --------------------------- */
  const dateLocale = useMemo(() => {
    const base = (i18n.language || "en").split("-")[0];
    switch (base) {
      case "pt":
        return ptBR;
      case "fr":
        return fr;
      case "de":
        return de;
      default:
        return enUS;
    }
  }, [i18n.language]);

  const datePattern = useMemo(() => {
    const base = (i18n.language || "en").split("-")[0];
    if (base === "pt") return "d 'de' MMM, yyyy";
    if (base === "fr") return "d MMM yyyy";
    if (base === "de") return "d. MMM yyyy";
    return "MMM d, yyyy";
  }, [i18n.language]);

  /* ------------------------------ Flags/State ------------------------------ */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single source of truth for this page.
  const [security, setSecurity] = useState<SecurityStatusResponse | null>(null);

  const [modalMode, setModalMode] = useState<"password" | "email" | "twofactor" | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  const [pwData, setPwData] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });

  const [emailData, setEmailData] = useState({
    current_email: "",
    new_email: "",
    current_password: "",
  });

  /* ------------------------------ 2FA -------------------------------------- */
  const [twoFactorIntentEnabled, setTwoFactorIntentEnabled] = useState<boolean | null>(null);
  const [twoFactorConfirm, setTwoFactorConfirm] = useState({ email: "", password: "" });
  const [isTwoFactorSubmitting, setIsTwoFactorSubmitting] = useState(false);

  /* ----------------------- Password validation (UI) ------------------------ */
  const pwValidation = useMemo(() => {
    if (!pwData.new_password) return { isValid: false, message: "" as React.ReactNode };
    return validatePassword(pwData.new_password);
  }, [pwData.new_password]);

  const pwMismatch = useMemo(() => {
    if (!pwData.confirm) return false;
    return pwData.new_password !== pwData.confirm;
  }, [pwData.new_password, pwData.confirm]);

  const pwSameAsCurrent = useMemo(() => {
    if (!pwData.current_password || !pwData.new_password) return false;
    return pwData.current_password === pwData.new_password;
  }, [pwData.current_password, pwData.new_password]);

  const canSubmitPassword = useMemo(() => {
    if (!pwData.current_password || !pwData.new_password || !pwData.confirm) return false;
    if (pwMismatch) return false;
    if (pwSameAsCurrent) return false;
    if (!pwValidation.isValid) return false;
    return true;
  }, [
    pwData.current_password,
    pwData.new_password,
    pwData.confirm,
    pwMismatch,
    pwSameAsCurrent,
    pwValidation.isValid,
  ]);

  /* ----------------------- Email validation (UI) ------------------------ */
  const canSubmitEmail = useMemo(() => {
    const cur = (emailData.current_email || "").trim();
    const next = (emailData.new_email || "").trim();
    const pw = (emailData.current_password || "").trim();
    if (!cur || !next || !pw) return false;
    if (cur.toLowerCase() === next.toLowerCase()) return false;
    return true;
  }, [emailData.current_email, emailData.new_email, emailData.current_password]);

  const currentTwoFactorEnabled = !!security?.two_factor_enabled;

  /* ------------------------------ Bootstrap -------------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const sec = await api.getSecurityStatus();
        if (!mounted) return;
        setSecurity(sec.data);
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------------- Handlers -------------------------------- */
  const refreshSecurity = useCallback(async () => {
    try {
      const sec = await api.getSecurityStatus();
      setSecurity(sec.data);
    } catch {
      /* silent */
    }
  }, []);

  const openPasswordModal = useCallback(() => {
    setPwData({ current_password: "", new_password: "", confirm: "" });
    setModalMode("password");
  }, []);

  const openEmailModal = useCallback(() => {
    const currentEmail = (security?.email ?? authUser?.email ?? "").trim();
    setEmailData({
      current_email: currentEmail,
      new_email: "",
      current_password: "",
    });
    setModalMode("email");
  }, [security?.email, authUser?.email]);

  const openTwoFactorConfirmModal = useCallback((nextEnabled: boolean) => {
    setTwoFactorIntentEnabled(nextEnabled);
    setTwoFactorConfirm({ email: "", password: "" });
    setModalMode("twofactor");
  }, []);

  const closeModal = useCallback(() => {
    setPwData({ current_password: "", new_password: "", confirm: "" });

    setEmailData((prev) => ({
      current_email: (security?.email ?? authUser?.email ?? prev.current_email).trim(),
      new_email: "",
      current_password: "",
    }));

    setTwoFactorIntentEnabled(null);
    setTwoFactorConfirm({ email: "", password: "" });

    setModalMode(null);
  }, [security?.email, authUser?.email]);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPwData((p) => ({ ...p, [name]: value }));
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailData((p) => ({ ...p, [name]: value }));
  }, []);

  const handlePasswordSubmit = useCallback(async () => {
    const { current_password, new_password, confirm } = pwData;

    if (new_password !== confirm) {
      setSnack({ message: t("toast.passwordMismatch"), severity: "error" });
      return;
    }
    if (current_password === new_password) {
      setSnack({ message: t("toast.samePassword"), severity: "error" });
      return;
    }

    const validation = validatePassword(new_password);
    if (!validation.isValid) {
      setSnack({
        message: validation.message || t("toast.weakPassword"),
        severity: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.passwordChange({ current_password, new_password });
      closeModal();
      setSnack({
        message:
          (res as { data?: { message?: string } })?.data?.message ||
          t("toast.passwordChangeRequested"),
        severity: "success",
      });

      await refreshSecurity();
    } catch (err: unknown) {
      if (isApiErrorBody(err)) {
        const message =
          err.code === "invalid_password"
            ? t("toast.invalidCurrentPassword")
            : getApiErrorMessage(err) ?? t("toast.changeError");
        setSnack({ message, severity: "error" });
      } else if (err instanceof Error) {
        setSnack({ message: err.message, severity: "error" });
      } else {
        setSnack({ message: t("toast.unexpected"), severity: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [pwData, t, closeModal, refreshSecurity]);

  const handleEmailSubmit = useCallback(async () => {
    const { current_email, new_email, current_password } = emailData;

    if (!current_email || !new_email || !current_password) {
      setSnack({ message: t("toast.missingFields"), severity: "error" });
      return;
    }

    if (current_email.trim().toLowerCase() === new_email.trim().toLowerCase()) {
      setSnack({ message: t("toast.sameEmail"), severity: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.emailChange({ current_email, new_email, current_password });
      closeModal();
      setSnack({ message: t("toast.emailChangeRequested"), severity: "success" });

      await refreshSecurity();
    } catch (err: unknown) {
      if (isApiErrorBody(err)) {
        let message: string;

        switch (err.code) {
          case "email_unavailable":
            message = getApiErrorMessage(err) ?? t("toast.emailInUse");
            break;
          case "same_email":
            message = getApiErrorMessage(err) ?? t("toast.sameEmail");
            break;
          case "invalid_credentials":
            message = t("toast.invalidCurrentPassword");
            break;
          case "current_email_mismatch":
            message = t("toast.currentEmailMismatch");
            break;
          default:
            message = getApiErrorMessage(err) ?? t("toast.emailChangeError");
        }

        setSnack({ message, severity: "error" });
      } else if (err instanceof Error) {
        setSnack({ message: err.message, severity: "error" });
      } else {
        setSnack({ message: t("toast.unexpected"), severity: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [emailData, t, closeModal, refreshSecurity]);

  const handleTwoFactorCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextEnabled = e.target.checked;
      openTwoFactorConfirmModal(nextEnabled);
    },
    [openTwoFactorConfirmModal]
  );

  const handleTwoFactorConfirmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTwoFactorConfirm((p) => (name === "email" ? { ...p, email: value } : { ...p, password: value }));
  }, []);

  const handleTwoFactorSubmit = useCallback(async () => {
    if (twoFactorIntentEnabled === null) return;

    const expectedEmail = (security?.email ?? authUser?.email ?? "").trim().toLowerCase();
    const providedEmail = (twoFactorConfirm.email || "").trim().toLowerCase();
    const password = twoFactorConfirm.password || "";

    if (!providedEmail || !password) {
      setSnack({ message: t("toast.missingFields"), severity: "error" });
      return;
    }

    if (!expectedEmail || providedEmail !== expectedEmail) {
      setSnack({ message: t("toast.emailMismatch"), severity: "error" });
      return;
    }

    setIsTwoFactorSubmitting(true);
    try {
      await api.updateTwoFactorSettings({
        enabled: twoFactorIntentEnabled,
        current_password: password,
      });

      closeModal();

      setSnack({
        message: twoFactorIntentEnabled ? t("toast.twoFactorEnabled") : t("toast.twoFactorDisabled"),
        severity: "success",
      });

      await refreshSecurity();
    } catch (err: unknown) {
      if (isApiErrorBody(err)) {
        const message =
          err.code === "invalid_password"
            ? t("toast.invalidCurrentPassword")
            : getApiErrorMessage(err) ?? t("toast.changeError");
        setSnack({ message, severity: "error" });
      } else if (err instanceof Error) {
        setSnack({ message: err.message, severity: "error" });
      } else {
        setSnack({ message: t("toast.unexpected"), severity: "error" });
      }
    } finally {
      setIsTwoFactorSubmitting(false);
    }
  }, [
    twoFactorIntentEnabled,
    twoFactorConfirm.email,
    twoFactorConfirm.password,
    security?.email,
    authUser?.email,
    t,
    closeModal,
    refreshSecurity,
  ]);

  /* ------------------------------- UX hooks -------------------------------- */
  const closeTransientOverlays = useCallback((): boolean => {
    if (typeof document === "undefined") return false;

    const hasOpen = !!document.querySelector(
      '[data-select-open="true"],[data-menu-open="true"],[data-popover-open="true"]'
    );
    if (!hasOpen) return false;

    const target = document.body || document.documentElement;
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    return true;
  }, []);

  const onEsc = useCallback(() => {
    if (!modalMode) return;
    if (isSubmitting || isTwoFactorSubmitting) return;
    if (closeTransientOverlays()) return;
    closeModal();
  }, [modalMode, isSubmitting, isTwoFactorSubmitting, closeTransientOverlays, closeModal]);

  // Global ESC stack (topmost wins)
  window.useGlobalEsc(!!modalMode, onEsc);

  useEffect(() => {
    document.body.style.overflow = modalMode ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalMode]);

  /* ----------------------------- Loading UI -------------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={5} />
      </>
    );
  }

  /* ---------------------------------- UI ---------------------------------- */
  const lastChangeLabel = security?.last_password_change
    ? format(new Date(security.last_password_change), datePattern, { locale: dateLocale })
    : t("field.never");

  const primaryEmail = security?.email ?? authUser?.email ?? "";

  return (
    <>
      <TopProgress active={isSubmitting || isTwoFactorSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  {getInitials(authUser?.name)}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("header.title")}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {t("section.access")}
                </span>
              </div>

              <div className="flex flex-col">
                <Row
                  label={t("field.primaryEmail")}
                  value={primaryEmail}
                  action={
                    <Button
                      variant="outline"
                      onClick={openEmailModal}
                      disabled={isSubmitting || isTwoFactorSubmitting}
                    >
                      {t("btn.changeEmail")}
                    </Button>
                  }
                  disabled={isSubmitting || isTwoFactorSubmitting}
                />

                <Row
                  label={t("field.password")}
                  value={
                    <>
                      {t("field.lastChange")} {lastChangeLabel}
                    </>
                  }
                  action={
                    <Button
                      variant="outline"
                      onClick={openPasswordModal}
                      disabled={isSubmitting || isTwoFactorSubmitting}
                    >
                      {t("btn.changePassword")}
                    </Button>
                  }
                  disabled={isSubmitting || isTwoFactorSubmitting}
                />

                <Row
                  label={t("field.twoFactor")}
                  value={
                    security
                      ? currentTwoFactorEnabled
                        ? t("field.enabled")
                        : t("field.disabled")
                      : t("field.unavailable")
                  }
                  action={
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={currentTwoFactorEnabled}
                        onChange={handleTwoFactorCheckboxChange}
                        disabled={!security || isSubmitting || isTwoFactorSubmitting}
                      />
                    </div>
                  }
                  disabled={!security || isSubmitting || isTwoFactorSubmitting}
                />
              </div>
            </div>
          </section>
        </div>

        {modalMode && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {modalMode === "password"
                    ? t("modal.title")
                    : modalMode === "email"
                    ? t("modal.emailTitle")
                    : twoFactorIntentEnabled
                    ? t("modal.twoFactorEnableTitle")
                    : t("modal.twoFactorDisableTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("modal.close")}
                  disabled={isSubmitting || isTwoFactorSubmitting}
                >
                  &times;
                </button>
              </header>

              <form
                className={`space-y-3 ${
                  isSubmitting || isTwoFactorSubmitting ? "opacity-70 pointer-events-none" : ""
                }`}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (modalMode === "password") void handlePasswordSubmit();
                  else if (modalMode === "email") void handleEmailSubmit();
                  else void handleTwoFactorSubmit();
                }}
              >
                {modalMode === "password" ? (
                  <>
                    <Input
                      kind="text"
                      label={t("field.current")}
                      name="current_password"
                      type="password"
                      value={pwData.current_password}
                      onChange={handlePasswordChange}
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
                      onChange={handlePasswordChange}
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

                    {pwSameAsCurrent && (
                      <p className="text-[12px] text-red-600">{t("toast.samePassword")}</p>
                    )}

                    <Input
                      kind="text"
                      label={t("field.confirm")}
                      name="confirm"
                      type="password"
                      value={pwData.confirm}
                      onChange={handlePasswordChange}
                      showTogglePassword
                      autoComplete="new-password"
                      required
                      onPaste={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      onDragOver={(e) => e.preventDefault()}
                    />

                    {pwMismatch && (
                      <p className="text-[12px] text-red-600">{t("toast.passwordMismatch")}</p>
                    )}
                  </>
                ) : modalMode === "email" ? (
                  <>
                    <Input
                      kind="text"
                      label={t("field.currentEmail")}
                      name="current_email"
                      type="email"
                      value={emailData.current_email}
                      onChange={handleEmailChange}
                      autoComplete="email"
                      required
                    />

                    <Input
                      kind="text"
                      label={t("field.newEmail")}
                      name="new_email"
                      type="email"
                      value={emailData.new_email}
                      onChange={handleEmailChange}
                      autoComplete="email"
                      required
                    />

                    <Input
                      kind="text"
                      label={t("field.currentPassword")}
                      name="current_password"
                      type="password"
                      value={emailData.current_password}
                      onChange={handleEmailChange}
                      showTogglePassword
                      autoComplete="current-password"
                      required
                    />
                  </>
                ) : (
                  <>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                      <div className="text-[12px] text-gray-800">
                        {twoFactorIntentEnabled
                          ? t("modal.twoFactorEnableHelp")
                          : t("modal.twoFactorDisableHelp")}
                      </div>
                    </div>

                    <Input
                      kind="text"
                      label={t("field.confirmEmail")}
                      name="email"
                      type="email"
                      value={twoFactorConfirm.email}
                      onChange={handleTwoFactorConfirmChange}
                      autoComplete="email"
                      required
                    />

                    <Input
                      kind="text"
                      label={t("field.currentPassword")}
                      name="password"
                      type="password"
                      value={twoFactorConfirm.password}
                      onChange={handleTwoFactorConfirmChange}
                      showTogglePassword
                      autoComplete="current-password"
                      required
                    />
                  </>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting || isTwoFactorSubmitting}
                  >
                    {t("btn.cancel")}
                  </Button>

                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      isTwoFactorSubmitting ||
                      (modalMode === "password"
                        ? !canSubmitPassword
                        : modalMode === "email"
                        ? !canSubmitEmail
                        : !twoFactorConfirm.email ||
                          !twoFactorConfirm.password ||
                          twoFactorIntentEnabled === null)
                    }
                  >
                    {modalMode === "password"
                      ? t("btn.save")
                      : modalMode === "email"
                      ? t("btn.saveEmail")
                      : t("btn.confirm")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={5000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default SecurityAndPrivacy;

/* --------------------------------------------------------------------------
 * File: src/pages/SecurityAndPrivacy.tsx
 * Standardized flags + UX (matches Member/Entity/Department/Inventory)
 * - Flags: isInitialLoading, isSubmitting
 * - Initial: TopProgress + PageSkeleton
 * - Background: TopProgress while submitting (change password / email)
 * - i18n: namespace "securityAndPrivacy"
 * -------------------------------------------------------------------------- */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR, enUS, fr, de } from "date-fns/locale";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { validatePassword } from "@/lib";
import { useTranslation } from "react-i18next";
import type { ApiErrorBody } from "@/models/Api";
import type { User } from "@/models/auth/user";

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

  const [user, setUser] = useState<User | null>(null);

  const [modalMode, setModalMode] = useState<"password" | "email" | null>(null);
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

  /* ------------------------------ Bootstrap -------------------------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await api.getUser();
        if (!mounted) return;
        setUser(resp.data.user as User);
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------------- Handlers -------------------------------- */
  const openPasswordModal = useCallback(() => {
    setPwData({ current_password: "", new_password: "", confirm: "" });
    setModalMode("password");
  }, []);

  const openEmailModal = useCallback(() => {
    setEmailData({
      current_email: user?.email ?? authUser?.email ?? "",
      new_email: "",
      current_password: "",
    });
    setModalMode("email");
  }, [user, authUser]);

  const closeModal = useCallback(() => {
    setPwData({ current_password: "", new_password: "", confirm: "" });
    setEmailData((prev) => ({
      current_email: user?.email ?? authUser?.email ?? prev.current_email,
      new_email: "",
      current_password: "",
    }));
    setModalMode(null);
  }, [user, authUser]);

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
      await api.changePassword({ current_password, new_password });
      closeModal();
      setSnack({ message: t("toast.success"), severity: "success" });

      // refresh last_password_change
      try {
        const resp = await api.getUser();
        setUser(resp.data.user as User);
      } catch {
        /* silent */
      }
    } catch (err: unknown) {
      if (isApiErrorBody(err)) {
        const message =
          err.code === "invalid_credentials"
            ? t("toast.invalidCurrentPassword")
            : getApiErrorMessage(err) ?? t("toast.changeError");

        setSnack({
          message,
          severity: "error",
        });
      } else if (err instanceof Error) {
        setSnack({ message: err.message, severity: "error" });
      } else {
        setSnack({ message: t("toast.unexpected"), severity: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [pwData, t, closeModal]);

  const handleEmailSubmit = useCallback(async () => {
    const { current_email, new_email, current_password } = emailData;

    if (!current_email || !new_email || !current_password) {
      setSnack({ message: t("toast.missingFields"), severity: "error" });
      return;
    }

    // Local check: new e-mail cannot be the same as current
    if (current_email.trim().toLowerCase() === new_email.trim().toLowerCase()) {
      setSnack({ message: t("toast.sameEmail"), severity: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.changeEmail({
        current_email,
        new_email,
        current_password,
      });
      closeModal();
      setSnack({
        message: t("toast.emailChangeRequested"),
        severity: "success",
      });

      // Optional: refresh user (email will only change after verification)
      try {
        const resp = await api.getUser();
        setUser(resp.data.user as User);
      } catch {
        /* silent */
      }
    } catch (err: unknown) {
      if (isApiErrorBody(err)) {
        let message: string;

        switch (err.code) {
          case "email_unavailable": {
            // Prefer backend text ("This email is already in use.")
            // but fall back to i18n if needed.
            message = getApiErrorMessage(err) ?? t("toast.emailInUse");
            break;
          }
          case "same_email": {
            message = getApiErrorMessage(err) ?? t("toast.sameEmail");
            break;
          }
          case "invalid_credentials": {
            message = t("toast.invalidCurrentPassword");
            break;
          }
          case "current_email_mismatch": {
            message = t("toast.currentEmailMismatch");
            break;
          }
          default: {
            message = getApiErrorMessage(err) ?? t("toast.emailChangeError");
          }
        }

        setSnack({
          message,
          severity: "error",
        });
      } else if (err instanceof Error) {
        setSnack({ message: err.message, severity: "error" });
      } else {
        setSnack({ message: t("toast.unexpected"), severity: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [emailData, t, closeModal]);

  /* ------------------------------- UX hooks -------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalMode) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalMode, closeModal]);

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
  return (
    <>
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

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

              <div className="divide-y divide-gray-200">
                {/* Email change row */}
                <Row
                  label={t("field.primaryEmail")}
                  value={user?.email ?? authUser?.email ?? ""}
                  action={
                    <Button
                      variant="outline"
                      onClick={openEmailModal}
                      disabled={isSubmitting}
                    >
                      {t("btn.changeEmail")}
                    </Button>
                  }
                  disabled={isSubmitting}
                />

                {/* Password change row */}
                <Row
                  label={t("field.password")}
                  value={
                    <>
                      {t("field.lastChange")}{" "}
                      {user?.last_password_change
                        ? format(new Date(user.last_password_change), datePattern, {
                            locale: dateLocale,
                          })
                        : t("field.never")}
                    </>
                  }
                  action={
                    <Button
                      variant="outline"
                      onClick={openPasswordModal}
                      disabled={isSubmitting}
                    >
                      {t("btn.changePassword")}
                    </Button>
                  }
                  disabled={isSubmitting}
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
                  {modalMode === "password" ? t("modal.title") : t("modal.emailTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("modal.close")}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </header>

              <form
                className={`space-y-3 ${
                  isSubmitting ? "opacity-70 pointer-events-none" : ""
                }`}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (modalMode === "password") {
                    void handlePasswordSubmit();
                  } else if (modalMode === "email") {
                    void handleEmailSubmit();
                  }
                }}
              >
                {modalMode === "password" ? (
                  <>
                    <Input
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
                      label={t("field.new")}
                      name="new_password"
                      type="password"
                      value={pwData.new_password}
                      onChange={handlePasswordChange}
                      showTogglePassword
                      autoComplete="new-password"
                      required
                    />
                    <Input
                      label={t("field.confirm")}
                      name="confirm"
                      type="password"
                      value={pwData.confirm}
                      onChange={handlePasswordChange}
                      showTogglePassword
                      autoComplete="new-password"
                      required
                    />
                  </>
                ) : (
                  <>
                    <Input
                      label={t("field.currentEmail")}
                      name="current_email"
                      type="email"
                      value={emailData.current_email}
                      onChange={handleEmailChange}
                      autoComplete="email"
                      required
                    />
                    <Input
                      label={t("field.newEmail")}
                      name="new_email"
                      type="email"
                      value={emailData.new_email}
                      onChange={handleEmailChange}
                      autoComplete="email"
                      required
                    />
                    <Input
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
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    {t("btn.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {modalMode === "password" ? t("btn.save") : t("btn.saveEmail")}
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

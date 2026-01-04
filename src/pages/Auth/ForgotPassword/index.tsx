/* --------------------------------------------------------------------------
 * File: src/pages/Auth/ForgotPassword.tsx
 * - “New logic” alignment:
 *   - Always show a generic success/info message (anti-enumeration).
 *   - Support either 204/void OR a { message } payload (future-proof).
 *   - More robust error extraction (ApiErrorBody or Error).
 * -------------------------------------------------------------------------- */

import { useEffect, useState, useCallback } from "react";
import type { FormEvent, ChangeEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/api/requests";
import Snackbar from "@/shared/ui/Snackbar";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import type { ApiErrorBody } from "@/models/Api";

type Snack =
  | {
      message: ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

function isApiErrorBody(err: unknown): err is ApiErrorBody {
  return typeof err === "object" && err !== null && "code" in err;
}

function getApiErrorMessage(error: ApiErrorBody): string | undefined {
  if (typeof error.message === "string" && error.message.trim()) return error.message;

  const detail = error.detail;
  if (typeof detail === "string" && detail.trim()) return detail;

  if (detail && typeof detail === "object" && "detail" in detail) {
    const inner = (detail as { detail?: unknown }).detail;
    if (typeof inner === "string" && inner.trim()) return inner;
  }

  return undefined;
}

const ForgotPassword = () => {
  const { t } = useTranslation("forgotPassword");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const normalizedEmail = email.trim();
      if (!normalizedEmail) {
        setSnack({ message: t("fillEmail"), severity: "warning" });
        return;
      }

      setIsLoading(true);
      try {
        // Anti-enumeration: backend should respond the same even if the email doesn't exist.
        const res = await api.passwordReset(normalizedEmail);

        // Future-proof: support either void/204 OR a message payload.
        const msg =
          (res as unknown as { data?: { message?: string } })?.data?.message ||
          t("resetRequestedMessage");

        setSnack({ message: msg, severity: "info" });
        setEmail("");
      } catch (err: unknown) {
        // Keep messaging conservative (do not leak account existence).
        if (isApiErrorBody(err)) {
          const msg = getApiErrorMessage(err) || t("genericError");
          setSnack({ message: msg, severity: "error" });
          return;
        }

        setSnack({
          message: err instanceof Error ? err.message : t("genericError"),
          severity: "error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [email, t],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md bg-white shadow-sm rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">{t("heading")}</h1>
        <p className="text-sm text-slate-500 mb-6">{t("description")}</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            kind="text"
            label={t("emailLabel")}
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!email.trim() || isLoading}
            className="w-full h-11 rounded-xl text-sm font-medium"
          >
            {t("submitButton")}
          </Button>
        </form>

        <div className="mt-4 text-sm">
          <Link
            to="/signin"
            className="text-slate-700 hover:text-slate-900 hover:underline underline-offset-4"
          >
            {t("backToLogin")}
          </Link>
        </div>
      </div>

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </div>
  );
};

export default ForgotPassword;

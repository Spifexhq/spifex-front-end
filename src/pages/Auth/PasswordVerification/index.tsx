// src/pages/Auth/PasswordVerification.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/api/requests";
import Button from "@/shared/ui/Button";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

const PasswordVerification: React.FC = () => {
  const { t } = useTranslation("passwordVerification");
  const { uidb64, token } = useParams<{ uidb64?: string; token?: string }>();
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = useState(true);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const getApiErrorMessage = useCallback(
    (err: unknown) => {
      if (!err || typeof err !== "object") return t("genericBackendError");
      const e = err as { message?: unknown; detail?: unknown };
      if (typeof e.message === "string" && e.message) return e.message;
      if (typeof e.detail === "string" && e.detail) return e.detail;
      return t("genericBackendError");
    },
    [t],
  );

  useEffect(() => {
    document.title = t("pageTitle");

    const run = async () => {
      if (!uidb64 || !token) {
        setMessage(t("invalidParams"));
        setSuccess(false);
        setIsVerifying(false);
        return;
      }

      try {
        const res = await api.verifyPasswordChange(uidb64, token);
        if ("error" in res) {
          setMessage(getApiErrorMessage(res.error));
          setSuccess(false);
        } else {
          setMessage(t("successMessage"));
          setSuccess(true);
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : t("genericUnexpectedError"));
        setSuccess(false);
      } finally {
        setIsVerifying(false);
      }
    };

    void run();
  }, [uidb64, token, t, getApiErrorMessage]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="max-w-md w-full">
        {isVerifying ? (
          <div className="flex justify-center items-center h-60">
            <TopProgress active={true} variant="center" />
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-2xl p-6 sm:p-8 text-center">
            <h1 className="text-2xl font-semibold text-slate-900 mb-4">
              {success ? t("successTitle") : t("errorTitle")}
            </h1>

            <p className="text-sm text-slate-500 mb-6">{message}</p>

            {success && (
              <Button
                variant="primary"
                onClick={() => navigate("/signin")}
                className="w-full h-11 rounded-xl text-sm font-medium"
              >
                {t("goToLoginButton")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordVerification;

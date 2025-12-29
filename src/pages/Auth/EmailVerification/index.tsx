import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/api/requests";
import Button from "@/components/ui/Button";
import TopProgress from "@/components/ui/Loaders/TopProgress";

const EmailVerification = () => {
  const { t } = useTranslation("emailVerification");
  const { uidb64, token } = useParams<{ uidb64?: string; token?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationMessage, setMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [isCancellation, setIsCancellation] = useState(false);

  const getApiErrorMessage = useCallback(
    (err: unknown) => {
      if (!err || typeof err !== "object") return t("genericBackendError");
      const e = err as { message?: unknown; detail?: unknown };
      if (typeof e.message === "string" && e.message) return e.message;
      if (typeof e.detail === "string" && e.detail) return e.detail;
      return t("genericBackendError");
    },
    [t]
  );

  useEffect(() => {
    document.title = t("pageTitle");

    const verify = async () => {
      if (!uidb64 || !token) {
        setMsg(t("invalidParams"));
        setIsVerifying(false);
        setSuccess(false);
        return;
      }

      try {
        const isPendingEmailRoute = location.pathname.includes(
          "verify-pending-email"
        );
        const searchParams = new URLSearchParams(location.search);
        const isCancel =
          isPendingEmailRoute && searchParams.get("cancel") === "1";

        setIsCancellation(isCancel);

        const call = isPendingEmailRoute
          ? isCancel
            ? api.cancelEmailChange
            : api.verifyNewEmail
          : api.verifyEmail;

        const res = await call(uidb64, token);

        if ("error" in res) {
          setMsg(getApiErrorMessage(res.error));
          setSuccess(false);
        } else {
          setMsg(isCancel ? t("cancelSuccessMessage") : t("successMessage"));
          setSuccess(true);
        }
      } catch (err) {
        setMsg(err instanceof Error ? err.message : t("genericUnexpectedError"));
        setSuccess(false);
      } finally {
        setIsVerifying(false);
      }
    };

    void verify();
  }, [
    uidb64,
    token,
    location.pathname,
    location.search,
    t,
    getApiErrorMessage,
  ]);

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
              {success
                ? isCancellation
                  ? t("cancelSuccessTitle")
                  : t("successTitle")
                : t("errorTitle")}
            </h1>

            <p className="text-sm text-slate-500 mb-6">{verificationMessage}</p>

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

export default EmailVerification;

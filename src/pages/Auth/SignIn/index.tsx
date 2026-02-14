// src/pages/SignIn.tsx
import React, { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ApiErrorBody } from "@/models/Api";

import { useAuth } from "@/api";
import Snackbar from "@/shared/ui/Snackbar";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";

import signInBackground from "@/assets/Images/background/signin-background.svg";
import logoBlack from "@/assets/Icons/logo/logo-black.svg";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type SnackSeverity = NonNullable<Snack>["severity"];

const REMEMBERED_EMAIL_KEY = "spifex:rememberedEmail";
const MAX_RESEND_ATTEMPTS = 2;
const RESEND_COUNTDOWN_SECONDS = 30;

type SignInStep = "credentials" | "twofactor";

type MfaRequiredPayload = {
  mfa_required: true;
  challenge_id: string;
  expires_at?: string;
  channel?: string;
};

function isApiErrorBody(err: unknown): err is ApiErrorBody {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err &&
    typeof (err as { code: unknown }).code === "string" &&
    typeof (err as { message: unknown }).message === "string"
  );
}

function isMfaRequiredPayload(value: unknown): value is MfaRequiredPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<MfaRequiredPayload>;
  return v.mfa_required === true && typeof v.challenge_id === "string" && v.challenge_id.trim().length > 0;
}

const SignIn: React.FC = () => {
  const { t } = useTranslation("signIn");
  const navigate = useNavigate();

  const { handleSignIn, handleVerifyTwoFactor, handleResendTwoFactor } = useAuth();

  const [step, setStep] = useState<SignInStep>("credentials");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);

  const [challengeId, setChallengeId] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberDevice(true);
    }
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const isFormIncomplete = useMemo(() => {
    if (step === "credentials") return normalizedEmail === "" || password === "";
    return twoFactorCode.trim().length !== 6;
  }, [step, normalizedEmail, password, twoFactorCode]);

  const canResendCode = useMemo(() => {
    return resendCountdown === 0 && resendAttempts < MAX_RESEND_ATTEMPTS;
  }, [resendCountdown, resendAttempts]);

  const resolveErrorMessage = (err: unknown): { message: React.ReactNode; severity: SnackSeverity } => {
    if (isApiErrorBody(err)) {
      switch (err.code) {
        case "invalid_credentials":
          return { message: t("invalidCredentials"), severity: "error" };
        case "email_not_verified":
          return { message: t("emailNotVerified"), severity: "warning" };
        case "account_inactive":
          return { message: t("accountInactive"), severity: "warning" };
        case "throttled":
          return { message: t("tooManyAttempts"), severity: "warning" };

        case "mfa_invalid_code":
          return { message: t("twoFactorInvalidCode"), severity: "error" };
        case "mfa_expired":
          return { message: t("twoFactorExpired"), severity: "warning" };
        case "mfa_locked":
          return { message: t("tooManyAttempts"), severity: "warning" };

        default:
          return { message: t("unexpectedError"), severity: "error" };
      }
    }

    if (err instanceof Error) {
      return { message: err.message || t("unexpectedError"), severity: "error" };
    }

    return { message: t("unexpectedError"), severity: "error" };
  };

  const persistRememberedEmail = (emailToPersist: string) => {
    if (rememberDevice) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, emailToPersist);
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  };

  const startTwoFactor = (id: string) => {
    setChallengeId(id);
    setTwoFactorCode("");
    setStep("twofactor");
    setResendCountdown(RESEND_COUNTDOWN_SECONDS);
    setResendAttempts(0);
    setSnack({ message: t("twoFactorRequired"), severity: "info" });
  };

  const resetToCredentials = () => {
    setStep("credentials");
    setTwoFactorCode("");
    setChallengeId("");
    setResendCountdown(0);
    setResendAttempts(0);
  };

  const handleSubmitCredentials = async () => {
    if (normalizedEmail === "" || password === "") {
      setSnack({ message: t("fillAllFields"), severity: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await handleSignIn(normalizedEmail, password);

      if (isMfaRequiredPayload(res.data)) {
        startTwoFactor(res.data.challenge_id);
        return;
      }

      persistRememberedEmail(normalizedEmail);
      navigate("/cashflow");
    } catch (err: unknown) {
      const { message, severity } = resolveErrorMessage(err);
      setSnack({ message, severity });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTwoFactor = async () => {
    const code = twoFactorCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setSnack({ message: t("twoFactorEnter6Digits"), severity: "warning" });
      return;
    }

    if (!challengeId) {
      setSnack({ message: t("unexpectedError"), severity: "error" });
      resetToCredentials();
      return;
    }

    setIsLoading(true);
    try {
      await handleVerifyTwoFactor({ challenge_id: challengeId, code });

      persistRememberedEmail(normalizedEmail);
      navigate("/cashflow");
    } catch (err: unknown) {
      if (isApiErrorBody(err) && err.code === "mfa_expired") {
        const { message, severity } = resolveErrorMessage(err);
        setSnack({ message, severity });
        resetToCredentials();
        return;
      }

      const { message, severity } = resolveErrorMessage(err);
      setSnack({ message, severity });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === "credentials") {
      await handleSubmitCredentials();
    } else {
      await handleSubmitTwoFactor();
    }
  };

  const handleTwoFactorCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
    setTwoFactorCode(digitsOnly);
  };

  const handleResend = async () => {
    if (!challengeId || !canResendCode) return;

    setIsLoading(true);
    try {
      await handleResendTwoFactor({ challenge_id: challengeId });
      setResendAttempts((prev) => prev + 1);
      setResendCountdown(RESEND_COUNTDOWN_SECONDS);
      setSnack({ message: t("twoFactorResent"), severity: "success" });
    } catch (err: unknown) {
      const { message, severity } = resolveErrorMessage(err);
      setSnack({ message, severity });
    } finally {
      setIsLoading(false);
    }
  };

  const getResendButtonText = () => {
    if (resendCountdown > 0) {
      return `${t("twoFactorResend")} (${resendCountdown}s)`;
    }
    if (resendAttempts >= MAX_RESEND_ATTEMPTS) {
      return t("twoFactorResendTooSoon");
    }
    return t("twoFactorResend");
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <div className="flex flex-col w-full md:w-[55%] lg:w-1/2 px-6 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between mb-8">
          <a
            href="https://spifex.com"
            className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 rounded-lg"
          >
            <img src={logoBlack} alt="Spifex logo" className="h-7 w-auto sm:h-8" />
          </a>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                {step === "credentials" ? t("heading") : t("twoFactorHeading")}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {step === "credentials" ? t("subheading") : t("twoFactorSubheading")}
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {step === "credentials" ? (
                <>
                  <div className="space-y-4">
                    <Input
                      kind="text"
                      label={t("emailLabel")}
                      placeholder={t("emailPlaceholder")}
                      type="email"
                      value={email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoComplete="email"
                      autoCorrect="off"
                    />

                    <Input
                      kind="text"
                      label={t("passwordLabel")}
                      placeholder={t("passwordPlaceholder")}
                      type="password"
                      value={password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      disabled={isLoading}
                      showTogglePassword
                      autoComplete="current-password"
                      autoCorrect="off"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={rememberDevice}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberDevice(e.target.checked)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setRememberDevice((prev) => !prev)}
                        className="text-sm text-slate-600 select-none"
                        disabled={isLoading}
                      >
                        {t("rememberDevice")}
                      </button>
                    </div>

                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline underline-offset-4"
                    >
                      {t("forgotPassword")}
                    </Link>
                  </div>

                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={isLoading}
                    disabled={isFormIncomplete || isLoading}
                    className="w-full h-12 rounded-xl text-sm font-medium"
                  >
                    {t("signInButton")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs text-slate-500">
                        {t("twoFactorEmailHint")}{" "}
                        <span className="font-medium text-slate-700">{normalizedEmail}</span>
                      </div>
                    </div>

                    <Input
                      kind="text"
                      label={t("twoFactorCodeLabel")}
                      placeholder={t("twoFactorCodePlaceholder")}
                      type="text"
                      value={twoFactorCode}
                      onChange={handleTwoFactorCodeChange}
                      disabled={isLoading}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoCorrect="off"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={resetToCredentials}
                      className="text-sm text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 transition-colors"
                      disabled={isLoading}
                    >
                      {t("backToSignIn")}
                    </button>

                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-sm text-slate-600 hover:text-slate-900 hover:underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline transition-colors"
                      disabled={isLoading || !canResendCode}
                    >
                      {getResendButtonText()}
                    </button>
                  </div>

                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={isLoading}
                    disabled={isFormIncomplete || isLoading}
                    className="w-full h-12 rounded-xl text-sm font-medium"
                  >
                    {t("verifyCodeButton")}
                  </Button>
                </>
              )}
            </form>

            {step === "credentials" && (
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>{t("noAccount")}</span>
                <Link to="/signup" className="font-medium text-slate-900 hover:underline underline-offset-4">
                  {t("signUpCta")}
                </Link>
              </div>
            )}
          </div>
        </main>

        <footer className="mt-8 flex flex-col gap-2 text-[11px] text-slate-400">
          <div>{t("copyright")}</div>
        </footer>

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

      <div className="hidden md:flex md:w-[45%] lg:w-1/2 relative overflow-hidden bg-slate-900">
        <img
          src={signInBackground}
          alt="Spifex background"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/80 to-slate-800/60" />
        <div className="relative z-10 flex items-end justify-end w-full p-8" />
      </div>
    </div>
  );
};

export default SignIn;
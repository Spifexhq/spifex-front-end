import { useEffect, useState, FormEvent, MouseEvent, ChangeEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/api";
import Snackbar from "src/components/ui/Snackbar";
import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";
import Checkbox from "src/components/ui/Checkbox";

import signInBackground from "@/assets/Images/background/signin-background.svg";
import logoBlack from "@/assets/Icons/Logo/logo-black.svg";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

const REMEMBERED_EMAIL_KEY = "spifex:rememberedEmail";

const SignIn = () => {
  const { t } = useTranslation("signIn");

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const navigate = useNavigate();
  const { handleSignIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const isFormIncomplete = !email || !password;

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberDevice(true);
    }
  }, []);

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    if (isFormIncomplete) {
      setSnack({ message: t("fillAllFields"), severity: "warning" });
      return;
    }

    setIsLoading(true);

    try {
      await handleSignIn(email, password);

      // Remember or clear email based on checkbox
      if (rememberDevice) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      navigate("/cashflow");
    } catch (error) {
      setSnack({
        message:
          error instanceof Error && error.message
            ? error.message
            : t("unexpectedError"),
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Left section */}
      <div className="flex flex-col w-full md:w-[55%] lg:w-1/2 px-6 py-6 sm:px-10 sm:py-8">
        {/* Top logo */}
        <header className="flex items-center justify-between mb-8">
          <a
            href="https://spifex.com"
            className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 rounded-lg"
          >
            <img
              src={logoBlack}
              alt="Spifex logo"
              className="h-7 w-auto sm:h-8"
            />
          </a>
        </header>

        {/* Centered form */}
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                {t("heading")}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {t("subheading")}
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <Input
                  label={t("emailLabel")}
                  placeholder={t("emailPlaceholder")}
                  type="email"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  disabled={isLoading}
                  autoComplete="email"
                  autoCorrect="off"
                />

                <Input
                  label={t("passwordLabel")}
                  placeholder={t("passwordPlaceholder")}
                  type="password"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setRememberDevice(e.target.checked)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setRememberDevice((prev) => !prev)}
                    className="text-sm text-slate-600 select-none"
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

              <div>
                <Button
                  variant="primary"
                  type="submit"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  disabled={isFormIncomplete || isLoading}
                  className="w-full h-12 rounded-xl text-sm font-medium"
                >
                  {t("signInButton")}
                </Button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{t("noAccount")}</span>
              <Link
                to="/signup"
                className="font-medium text-slate-900 hover:underline underline-offset-4"
              >
                {t("signUpCta")}
              </Link>
            </div>
          </div>
        </main>

        {/* Footer (left section) */}
        <footer className="mt-8 flex flex-col gap-2 text-[11px] text-slate-400">
          <div className="hidden sm:block">
            {t("copyright")}
          </div>
          <div className="sm:hidden">
            {t("copyright")}
          </div>
        </footer>

        {/* Snackbar */}
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

      {/* Right section */}
      <div className="hidden md:flex md:w-[45%] lg:w-1/2 relative overflow-hidden bg-slate-900">
        <img
          src={signInBackground}
          alt="Spifex background"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/80 to-slate-800/60" />
        <div className="relative z-10 flex items-end justify-end w-full p-8">
          {/* Minimal, purely visual side */}
        </div>
      </div>
    </div>
  );
};

export default SignIn;

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/api/requests";
import Snackbar from "src/components/ui/Snackbar";
import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";

type Snack =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

const ForgotPassword = () => {
  const { t } = useTranslation("forgotPassword");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      setSnack({
        message: t("fillEmail"),
        severity: "warning",
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
      setSnack({
        message: t("resetRequestedMessage"),
        severity: "info",
      });
      setEmail("");
    } catch (err) {
      setSnack({
        message:
          err instanceof Error
            ? err.message
            : t("genericError"),
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md bg-white shadow-sm rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          {t("heading")}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {t("description")}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label={t("emailLabel")}
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            disabled={isLoading}
            autoComplete="email"
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!email || isLoading}
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

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/api/requests";
import { validatePassword } from "src/lib";
import Snackbar from "src/components/ui/Snackbar";
import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";

type Snack =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

const ResetPassword = () => {
  const { t } = useTranslation("resetPassword");
  const navigate = useNavigate();
  const { uidb64 = "", token = "" } = useParams();

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!p1 || !p2) {
      setSnack({
        message: t("fillBothPasswords"),
        severity: "warning",
      });
      return;
    }
    if (p1 !== p2) {
      setSnack({
        message: t("passwordsDontMatch"),
        severity: "warning",
      });
      return;
    }

    const v = validatePassword(p1);
    if (!v.isValid) {
      setSnack({ message: v.message, severity: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      await api.confirmPasswordReset(uidb64, token, p1);
      setSnack({
        message: t("successMessage"),
        severity: "success",
      });
      navigate("/signin");
    } catch (err) {
      setSnack({
        message:
          err instanceof Error
            ? err.message
            : t("invalidOrExpiredLink"),
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
            label={t("newPasswordLabel")}
            type="password"
            value={p1}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setP1(e.target.value)
            }
            showTogglePassword
            disabled={isLoading}
            autoComplete="new-password"
          />
          <Input
            label={t("confirmPasswordLabel")}
            type="password"
            value={p2}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setP2(e.target.value)
            }
            showTogglePassword
            disabled={isLoading}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full h-11 rounded-xl text-sm font-medium"
          >
            {t("saveNewPasswordButton")}
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

export default ResetPassword;

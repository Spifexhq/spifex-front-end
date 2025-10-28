/* --------------------------------------------------------------------------
 * File: src/pages/SecurityAndPrivacy.tsx
 * Style: Navbar fixa + SidebarSettings, light borders, compact labels
 * Notes: i18n group "securityAndPrivacy" inside the "settings" namespace
 * -------------------------------------------------------------------------- */

import axios from "axios";
import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR, enUS, fr, de } from "date-fns/locale";

import Navbar from "src/components/layout/Navbar";
import SidebarSettings from "src/components/layout/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";

import { api } from "src/api/requests";
import { useAuthContext } from "@/contexts/useAuthContext";
import { User } from "src/models/auth";
import { validatePassword } from "src/lib";
import { useTranslation } from "react-i18next";

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
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value}</p>
    </div>
    {action}
  </div>
);

/* -------------------------------------------------------------------------- */
const SecurityAndPrivacy = () => {
  const { t, i18n } = useTranslation(["settings"]);

  // Title + <html lang="...">
  useEffect(() => { document.title = t("settings:securityAndPrivacy.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  // date-fns locale + pattern by language
  const dateLocale = useMemo(() => {
    const base = (i18n.language || "en").split("-")[0];
    switch (base) {
      case "pt": return ptBR;
      case "fr": return fr;
      case "de": return de;
      default: return enUS;
    }
  }, [i18n.language]);

  const datePattern = useMemo(() => {
    const base = (i18n.language || "en").split("-")[0];
    if (base === "pt") return "d 'de' MMM, yyyy";
    if (base === "fr") return "d MMM yyyy";
    if (base === "de") return "d. MMM yyyy";
    return "MMM d, yyyy";
  }, [i18n.language]);

  const { user: authUser } = useAuthContext();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const [pwData, setPwData] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });

  /* ------------------------ Handlers ------------------------- */
  const openModal = () => setModalOpen(true);
  const closeModal = useCallback(() => {
    setPwData({ current_password: "", new_password: "", confirm: "" });
    setModalOpen(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPwData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const { current_password, new_password, confirm } = pwData;

    if (new_password !== confirm) {
      setSnack({ message: t("settings:securityAndPrivacy.toast.passwordMismatch"), severity: "error" });
      return;
    }
    if (current_password === new_password) {
      setSnack({ message: t("settings:securityAndPrivacy.toast.samePassword"), severity: "error" });
      return;
    }
    const validation = validatePassword(new_password);
    if (!validation.isValid) {
      setSnack({
        message: validation.message || t("settings:securityAndPrivacy.toast.weakPassword"),
        severity: "error",
      });
      return;
    }

    try {
      await api.changePassword({ current_password, new_password });
      closeModal();
      setSnack({ message: t("settings:securityAndPrivacy.toast.success"), severity: "success" });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setSnack({
          message: err.response?.data?.message ?? t("settings:securityAndPrivacy.toast.changeError"),
          severity: "error",
        });
      } else if (err instanceof Error) {
        setSnack({ message: err.message, severity: "error" });
      } else {
        setSnack({ message: t("settings:securityAndPrivacy.toast.unexpected"), severity: "error" });
      }
    }
  };

  /* ------------------------ Load user ------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.getUser();
        setUser(resp.data.user);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ------------------------ UX hooks ------------------------ */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  if (loading) return <SuspenseLoader />;

  /* --------------------------- UI --------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings userName={authUser?.name ?? ""} activeItem="security" />

      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  {getInitials(authUser?.name)}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("settings:securityAndPrivacy.header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("settings:securityAndPrivacy.header.title")}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {t("settings:securityAndPrivacy.section.access")}
                </span>
              </div>

              <div className="divide-y divide-gray-200">
                <Row
                  label={t("settings:securityAndPrivacy.field.password")}
                  value={
                    <>
                      {t("settings:securityAndPrivacy.field.lastChange")}{" "}
                      {user?.last_password_change
                        ? format(new Date(user.last_password_change), datePattern, { locale: dateLocale })
                        : t("settings:securityAndPrivacy.field.never")}
                    </>
                  }
                  action={
                    <Button
                      variant="outline"
                      className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                      onClick={openModal}
                    >
                      {t("settings:securityAndPrivacy.btn.changePassword")}
                    </Button>
                  }
                />
              </div>
            </div>
          </section>
        </div>

        {/* ---------------------- Modal ---------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {t("settings:securityAndPrivacy.modal.title")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:securityAndPrivacy.modal.close")}
                >
                  &times;
                </button>
              </header>

              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <Input
                  label={t("settings:securityAndPrivacy.field.current")}
                  name="current_password"
                  type="password"
                  value={pwData.current_password}
                  onChange={handleChange}
                  showTogglePassword
                  autoComplete="current-password"
                  required
                />
                <Input
                  label={t("settings:securityAndPrivacy.field.new")}
                  name="new_password"
                  type="password"
                  value={pwData.new_password}
                  onChange={handleChange}
                  showTogglePassword
                  autoComplete="new-password"
                  required
                />
                <Input
                  label={t("settings:securityAndPrivacy.field.confirm")}
                  name="confirm"
                  type="password"
                  value={pwData.confirm}
                  onChange={handleChange}
                  showTogglePassword
                  autoComplete="new-password"
                  required
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    {t("settings:securityAndPrivacy.btn.cancel")}
                  </Button>
                  <Button type="submit">{t("settings:securityAndPrivacy.btn.save")}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ----------------------- Snackbar ----------------------- */}
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

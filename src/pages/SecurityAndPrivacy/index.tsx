/* --------------------------------------------------------------------------
 * File: src/pages/SecurityAndPrivacy.tsx
 * Standardized flags + UX (matches Employee/Entity/Department/Inventory)
 * - Flags: isInitialLoading, isSubmitting
 * - Initial: TopProgress + PageSkeleton
 * - Background: TopProgress while submitting (change password)
 * - i18n: group "securityAndPrivacy" inside "settings"
 * -------------------------------------------------------------------------- */

import axios from "axios";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR, enUS, fr, de } from "date-fns/locale";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";

import { api } from "src/api/requests";
import { useAuthContext } from "src/hooks/useAuth";
import type { User } from "src/models/auth";
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
  disabled,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
  disabled?: boolean;
}) => (
  <div className={`flex items-center justify-between px-4 py-2.5 ${disabled ? "opacity-70 pointer-events-none" : ""}`}>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value}</p>
    </div>
    {action}
  </div>
);

/* -------------------------------------------------------------------------- */
const SecurityAndPrivacy: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);
  const { user: authUser } = useAuthContext();

  /* ----------------------------- Title + lang ------------------------------ */
  useEffect(() => { document.title = t("settings:securityAndPrivacy.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  /* ----------------------------- date-fns locale --------------------------- */
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

  /* ------------------------------ Flags/State ------------------------------ */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [user, setUser] = useState<User | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const [pwData, setPwData] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
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
    return () => { mounted = false; };
  }, []);

  /* ------------------------------- Handlers -------------------------------- */
  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => {
    setPwData({ current_password: "", new_password: "", confirm: "" });
    setModalOpen(false);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPwData((p) => ({ ...p, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
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

    setIsSubmitting(true);
    try {
      await api.changePassword({ current_password, new_password });
      closeModal();
      setSnack({ message: t("settings:securityAndPrivacy.toast.success"), severity: "success" });

      // Optionally refresh last_password_change from backend:
      try {
        const resp = await api.getUser();
        setUser(resp.data.user as User);
      } catch { /* silent */ }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setSnack({
          message: (err.response?.data)?.message ?? t("settings:securityAndPrivacy.toast.changeError"),
          severity: "error",
        });
      } else if (err instanceof Error) {
        setSnack({ message: err.message, severity: "error" });
      } else {
        setSnack({ message: t("settings:securityAndPrivacy.toast.unexpected"), severity: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [pwData, t, closeModal]);

  /* ------------------------------- UX hooks -------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

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
      {/* thin progress during password submission */}
      <TopProgress active={isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
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

          {/* Main card */}
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
                      onClick={openModal}
                      disabled={isSubmitting}
                    >
                      {t("settings:securityAndPrivacy.btn.changePassword")}
                    </Button>
                  }
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Modal */}
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
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </header>

              <form
                className={`space-y-3 ${isSubmitting ? "opacity-70 pointer-events-none" : ""}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmit();
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
                  <Button variant="cancel" type="button" onClick={closeModal} disabled={isSubmitting}>
                    {t("settings:securityAndPrivacy.btn.cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {t("settings:securityAndPrivacy.btn.save")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Snackbar */}
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

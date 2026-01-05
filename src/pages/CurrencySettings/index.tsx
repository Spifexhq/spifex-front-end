/* --------------------------------------------------------------------------
 * File: src/pages/CurrencySettings.tsx
 * -------------------------------------------------------------------------- */

import axios from "axios";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";

import type { CurrencyOption } from "@/lib/currency/currencies";
import { getCurrencies } from "@/lib/currency/currencies";

import type { RootState } from "@/redux/store";
import { setUserOrganization } from "@/redux";

/* ------------------------------- Types ----------------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ Helpers ----------------------------------- */
function getInitials(name?: string) {
  if (!name) return "CU";
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

/* -------------------------------------------------------------------------- */
const CurrencySettings: React.FC = () => {
  const { t, i18n } = useTranslation(["currencySettings", "common"]);
  const { user: authUser } = useAuthContext();

  const dispatch = useDispatch();
  const organization = useSelector((s: RootState) => s.auth.organization);

  useEffect(() => {
    document.title = t("currencySettings:title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currency, setCurrency] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [selectedCurrencyOption, setSelectedCurrencyOption] = useState<CurrencyOption[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const allCurrencies = useMemo<CurrencyOption[]>(() => {
    return getCurrencies(i18n.language || "en");
  }, [i18n.language]);

  const currentCurrencyLabel = useMemo(() => {
    if (!currency) return "—";
    const found = allCurrencies.find((c) => c.value === currency);
    return found?.label || currency;
  }, [currency, allCurrencies]);

  useEffect(() => {
    if (!currency) {
      setSelectedCurrencyOption([]);
      return;
    }
    const found = allCurrencies.find((c) => c.value === currency);
    setSelectedCurrencyOption(found ? [found] : []);
  }, [currency, allCurrencies]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await api.getOrgCurrency();
        if (!mounted) return;

        const code = (resp.data?.currency ?? null) as string | null;
        setCurrency(code);
        setSelectedCurrency(code);
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const openModal = useCallback(() => {
    setSelectedCurrency(currency ?? null);
    setCurrentPassword("");
    setModalOpen(true);
  }, [currency]);

  const closeModal = useCallback(() => {
    setCurrentPassword("");
    setModalOpen(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedCurrency) {
      setSnack({
        message: t("currencySettings:toast.noSelection"),
        severity: "error",
      });
      return;
    }

    if (!currentPassword) {
      setSnack({
        message: t("currencySettings:toast.missingPassword"),
        severity: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await api.updateOrgCurrency({
        currency: selectedCurrency,
        current_password: currentPassword,
      });
      const updatedCode = (resp.data?.currency ?? selectedCurrency) as string;

      // Local state (this page)
      setCurrency(updatedCode);

      // 🔄 Update Redux auth.organization with the new currency
      if (organization) {
        dispatch(
          setUserOrganization({
            ...organization,
            organization: organization.organization
              ? {
                  ...organization.organization,
                  currency: updatedCode,
                }
              : organization.organization,
          })
        );
      }

      setSnack({
        message: t("currencySettings:toast.success"),
        severity: "success",
      });
      closeModal();
    } catch (err) {
      let message: React.ReactNode = t("currencySettings:toast.updateError");

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 400 || status === 401) {
          // 🔒 Always show "wrong password" for 400/401
          message = t("currencySettings:toast.invalidPassword");
        } else if (data) {
          if (typeof data.message === "string") {
            message = data.message;
          } else if (typeof data.detail === "string") {
            message = data.detail;
          }
        }
      }

      // Never show err.message (which is "Request failed with status code 400")
      setSnack({
        message,
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCurrency, currentPassword, t, closeModal, dispatch, organization]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={5} />
      </>
    );
  }

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
                    {t("currencySettings:header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("currencySettings:header.title")}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {t("currencySettings:section.currency")}
                </span>
              </div>

              <div className="flex flex-col">
                <Row
                  label={t("currencySettings:field.current")}
                  value={currentCurrencyLabel}
                  action={
                    <Button variant="outline" onClick={openModal} disabled={isSubmitting}>
                      {t("currencySettings:btn.change")}
                    </Button>
                  }
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </section>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {t("currencySettings:modal.title")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("currencySettings:modal.close")}
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
                autoComplete="off" // strongest hint at form level
              >
                {/* Dummy fields to absorb browser autofill */}
                <input
                  type="text"
                  name="dummy"
                  autoComplete="username"
                  style={{ display: "none" }}
                  tabIndex={-1}
                />
                <input
                  type="password"
                  name="dummy"
                  autoComplete="new-password"
                  style={{ display: "none" }}
                  tabIndex={-1}
                />

                <SelectDropdown<CurrencyOption>
                  label={t("currencySettings:field.currency")}
                  items={allCurrencies}
                  selected={selectedCurrencyOption}
                  onChange={(items) => {
                    const code = items[0]?.value ?? null;
                    setSelectedCurrencyOption(items);
                    setSelectedCurrency(code);
                  }}
                  getItemKey={(item) => item.value}
                  getItemLabel={(item) => item.label}
                  singleSelect
                  hideCheckboxes
                  clearOnClickOutside={false}
                  buttonLabel={t("currencySettings:btnLabel.currency")}
                  customStyles={{ maxHeight: "260px" }}
                />

                <Input
                  kind="text"
                  label={t("currencySettings:field.password")}
                  name="currency_change_password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  showTogglePassword
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  required
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    {t("currencySettings:btn.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !selectedCurrency || !currentPassword}
                  >
                    {t("currencySettings:btn.save")}
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

export default CurrencySettings;

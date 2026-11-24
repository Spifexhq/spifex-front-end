import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";

/* --------------------------------------------------------------------------
 * File: src/pages/Settings/CurrencySettings/index.tsx
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

import { SettingsPageSkeleton } from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import { Select } from "src/shared/ui/Select";

import { api } from "@/core/api/requests";

import type { CurrencyOption } from "@/lib/currency/currencies";
import { getCurrencies } from "@/lib/currency/currencies";

import type { RootState } from "@/redux/store";
import { setUserOrganization } from "@/redux";
import { useAuthContext } from "@/hooks/useAuth";

/* ------------------------------- Types ----------------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ Helpers ----------------------------------- */

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
    className={`flex items-center justify-between px-4 py-2.5  settings-row ${
      disabled ? "opacity-70 pointer-events-none" : ""
    }`}
  >
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{value}</p>
    </div>
    {action}
  </div>
);

const errorMessage = (
  err: unknown,
  fallback: React.ReactNode,
  invalidPassword: React.ReactNode
): React.ReactNode => {
  if (!axios.isAxiosError(err)) return fallback;
  const status = err.response?.status;
  const data = err.response?.data;

  if (status === 400 || status === 401) {
    const fields = data?.fields ?? data?.detail;
    const passwordError =
      fields && typeof fields === "object" && "current_password" in fields;
    if (passwordError || status === 401) return invalidPassword;
  }
  if (data) {
    if (typeof data.message === "string") return data.message;
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.fields?.multi_currency_enabled === "string") {
      return data.fields.multi_currency_enabled;
    }
  }
  return fallback;
};

/* -------------------------------------------------------------------------- */
const CurrencySettings: React.FC = () => {
  const { t, i18n } = useTranslation(["currencySettings", "common"]);

  const dispatch = useDispatch();
  const organization = useSelector((s: RootState) => s.auth.organization);
  const { isOwner, isSuperUser, permissions } = useAuthContext();
  const [serverCanManage, setServerCanManage] = useState(false);
  const canManage =
    isOwner ||
    isSuperUser ||
    permissions.includes("change_organization_currency") ||
    serverCanManage;

  useEffect(() => {
    document.title = t("currencySettings:title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currency, setCurrency] = useState<string | null>(null);
  const [canChangeCurrency, setCanChangeCurrency] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [selectedCurrencyOption, setSelectedCurrencyOption] = useState<CurrencyOption[]>([]);

  const [multiCurrencyEnabled, setMultiCurrencyEnabled] = useState(false);
  const [canEnableMulti, setCanEnableMulti] = useState(true);
  const [canDisableMulti, setCanDisableMulti] = useState(false);
  const [disableBlockers, setDisableBlockers] = useState<Record<string, number>>({});

  const [currentPassword, setCurrentPassword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [modePassword, setModePassword] = useState("");

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

  const applyResponse = useCallback((resp: { data?: unknown }) => {
    const data = (resp.data ?? {}) as {
      currency?: string | null;
      multi_currency_enabled?: boolean;
      can_enable_multi_currency?: boolean;
      can_disable_multi_currency?: boolean;
      disable_blockers?: Record<string, number>;
      can_change?: boolean;
      can_manage?: boolean;
    };
    if (data.currency !== undefined) {
      const code = (data.currency ?? null) as string | null;
      setCurrency(code);
      setSelectedCurrency(code);
    }
    const enabled = Boolean(data.multi_currency_enabled);
    setCanChangeCurrency(data.can_change !== false);
    setMultiCurrencyEnabled(enabled);
    // Older backends may omit the capability flags; fall back to the mode so a
    // single-currency workspace is never blocked from enabling multi-currency.
    setCanEnableMulti(data.can_enable_multi_currency ?? !enabled);
    setCanDisableMulti(data.can_disable_multi_currency ?? enabled);
    setDisableBlockers(data.disable_blockers ?? {});
    setServerCanManage(data.can_manage === true);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await api.getOrgCurrency();
        if (!mounted) return;
        applyResponse(resp);
      } finally {
        if (mounted) setIsInitialLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applyResponse]);

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
    if (!canManage) return;
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

      setCurrency(updatedCode);
      applyResponse(resp);

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
      setSnack({
        message: errorMessage(
          err,
          t("currencySettings:toast.updateError"),
          t("currencySettings:toast.invalidPassword")
        ),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCurrency, currentPassword, t, closeModal, dispatch, organization, canManage, applyResponse]);

  const openModeModal = useCallback(() => {
    setModePassword("");
    setModeModalOpen(true);
  }, []);

  const closeModeModal = useCallback(() => {
    setModePassword("");
    setModeModalOpen(false);
  }, []);

  const nextModeEnabled = !multiCurrencyEnabled;

  const handleModeSubmit = useCallback(async () => {
    if (!canManage) return;
    if (!modePassword) {
      setSnack({
        message: t("currencySettings:toast.missingPassword"),
        severity: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await api.updateOrgCurrency({
        multi_currency_enabled: nextModeEnabled,
        current_password: modePassword,
      });
      applyResponse(resp);
      setSnack({
        message: nextModeEnabled
          ? t("currencySettings:toast.modeEnabled")
          : t("currencySettings:toast.modeDisabled"),
        severity: "success",
      });
      closeModeModal();
    } catch (err) {
      setSnack({
        message: errorMessage(
          err,
          t("currencySettings:toast.modeError"),
          t("currencySettings:toast.invalidPassword")
        ),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [canManage, modePassword, nextModeEnabled, applyResponse, t, closeModeModal]);

  const onEsc = useCallback(() => {
    closeModal();
  }, [closeModal]);

  const onModeEsc = useCallback(() => {
    closeModeModal();
  }, [closeModeModal]);

  window.useGlobalEsc(modalOpen, onEsc);
  window.useGlobalEsc(modeModalOpen, onModeEsc);

  useEffect(() => {
    document.body.style.overflow = modalOpen || modeModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen, modeModalOpen]);

  if (isInitialLoading) {
    return (
      <>
        <SettingsPageSkeleton rows={3} variant="panel" />
      </>
    );
  }

  const modeLabel = multiCurrencyEnabled
    ? t("currencySettings:mode.multi")
    : t("currencySettings:mode.single");

  const modeDescription = multiCurrencyEnabled
    ? t("currencySettings:mode.multiHint")
    : t("currencySettings:mode.singleHint");

  const modeActionAllowed = multiCurrencyEnabled ? canDisableMulti : canEnableMulti;

  const blockerSummary = Object.entries(disableBlockers)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${t(`currencySettings:blockers.${key}`, key)}`)
    .join(", ");

  return (
    <>
      <TopProgress active={isSubmitting} variant="top" />

      <main className="settings-page">
        <div className="settings-content ">
          

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden settings-panel">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 settings-panel-heading">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {t("currencySettings:section.currency")}
                </span>
              </div>

              <div className="flex flex-col">
                <Row
                  label={t("currencySettings:field.current")}
                  value={currentCurrencyLabel}
                  action={
                    <Button
                      variant="secondary"
                      onClick={openModal}
                      disabled={isSubmitting || !canManage || !canChangeCurrency}
                      title={!canChangeCurrency ? t("currencySettings:currencyLocked") : undefined}
                    >
                      {t("currencySettings:btn.change")}
                    </Button>
                  }
                  disabled={isSubmitting || !canManage || !canChangeCurrency}
                />
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden settings-panel">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 settings-panel-heading">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  {t("currencySettings:section.mode")}
                </span>
              </div>

              <div className="flex flex-col">
                <Row
                  label={t("currencySettings:field.mode")}
                  value={
                    <span className="block">
                      <span className="block">{modeLabel}</span>
                      <span className="mt-0.5 block text-[12px] font-normal text-gray-500">
                        {modeDescription}
                      </span>
                    </span>
                  }
                  action={
                    <Button
                      variant="secondary"
                      onClick={openModeModal}
                      disabled={isSubmitting || !canManage || !modeActionAllowed}
                      title={
                        !canManage
                          ? t("currencySettings:permissionRequired")
                          : !modeActionAllowed && !multiCurrencyEnabled
                            ? t("currencySettings:mode.alreadySingle")
                            : undefined
                      }
                    >
                      {multiCurrencyEnabled
                        ? t("currencySettings:btn.disableMulti")
                        : t("currencySettings:btn.enableMulti")}
                    </Button>
                  }
                  disabled={isSubmitting || !canManage}
                />
                {!canManage ? (
                  <p className="px-4 pb-3 -mt-1 text-[12px] text-gray-500">
                    {t("currencySettings:permissionRequired")}
                  </p>
                ) : null}
                {multiCurrencyEnabled && !canDisableMulti && blockerSummary ? (
                  <p className="px-4 pb-3 -mt-1 text-[12px] text-gray-500">
                    {t("currencySettings:mode.blocked", { blockers: blockerSummary })}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <SidePanel isOpen={modalOpen} onClose={closeModal} title={t("currencySettings:modal.title")}><SidePanelForm
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

                <Select<CurrencyOption>
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
                    variant="secondary"
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
              </SidePanelForm></SidePanel>

        <SidePanel
          isOpen={modeModalOpen}
          onClose={closeModeModal}
          title={
            nextModeEnabled
              ? t("currencySettings:modal.enableModeTitle")
              : t("currencySettings:modal.disableModeTitle")
          }
        >
          <SidePanelForm
            className={`space-y-3 ${isSubmitting ? "opacity-70 pointer-events-none" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              void handleModeSubmit();
            }}
            autoComplete="off"
          >
            <p className="text-[13px] text-gray-600">
              {nextModeEnabled
                ? t("currencySettings:modal.enableModeBody")
                : t("currencySettings:modal.disableModeBody")}
            </p>

            <Input
              kind="text"
              label={t("currencySettings:field.password")}
              name="currency_mode_password"
              type="password"
              value={modePassword}
              onChange={(e) => setModePassword(e.target.value)}
              showTogglePassword
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              required
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                type="button"
                onClick={closeModeModal}
                disabled={isSubmitting}
              >
                {t("currencySettings:btn.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || !modePassword}>
                {nextModeEnabled
                  ? t("currencySettings:btn.enableMulti")
                  : t("currencySettings:btn.disableMulti")}
              </Button>
            </div>
          </SidePanelForm>
        </SidePanel>
      </main>

      <Snackbar
        notificationKey={snack}
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

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import FloatingDialog from "@/components/Modal/FloatingDialog";
import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { FinancialFeaturesResponse } from "@/models/finance/profitLoss";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { SettingsPageSkeleton } from "@/shared/ui/Loaders/PageSkeleton";

type Target = {
  accounting_enabled?: boolean;
  pnl_enabled?: boolean;
};

type Snack =
  | { message: string; severity: "success" | "error" | "warning" | "info" }
  | null;

const actionLinkClass =
  "text-[12px] font-medium text-[color:var(--accentPrimaryStrong)] hover:underline";

export default function FinancialModulesSettings() {
  const { t } = useTranslation("profitLoss");
  const { handleInitUser } = useAuthContext();
  const [features, setFeatures] = useState<FinancialFeaturesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Target | null>(null);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledgeGap, setAcknowledgeGap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await api.getFinancialFeatures();
      setFeatures(response.data);
    } catch (cause) {
      setLoadError(apiErrorMessage(cause, t("modules.loadError")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = (next: Target) => {
    setTarget(next);
    setPassword("");
    setReason("");
    setAcknowledgeGap(false);
  };

  const closeDialog = () => {
    if (busy) return;
    setTarget(null);
  };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const response = await api.updateFinancialFeatures({
        ...target,
        acknowledge_posting_gap: acknowledgeGap,
        reason,
        current_password: password,
      });
      setFeatures(response.data);
      setTarget(null);
      setSnack({ message: t("modules.saved"), severity: "success" });
      await handleInitUser();
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("modules.saveError")), severity: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !features) return <SettingsPageSkeleton rows={2} variant="panel" />;

  if (!features) {
    return (
      <main className="settings-page">
        <div className="settings-content">
          <section className="settings-panel overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="settings-panel-heading border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">{t("modules.optionalSection")}</h2>
            </div>
            <div className="flex flex-col gap-3 px-4 py-4">
              <p role="alert" className="text-[13px] text-red-700">
                {loadError || t("modules.loadError")}
              </p>
              <div>
                <Button variant="secondary" size="xs" onClick={() => void load()}>
                  {t("modules.retry")}
                </Button>
              </div>
            </div>
          </section>
          <Snackbar
            open={snack != null}
            message={snack?.message}
            severity={snack?.severity}
            onClose={() => setSnack(null)}
          />
        </div>
      </main>
    );
  }

  const accounting = features.accounting;
  const pnl = features.pnl;
  const needsGapAcknowledgement =
    target?.accounting_enabled === false && accounting.requires_disable_acknowledgement;
  const dialogTitle =
    target?.accounting_enabled === false
      ? t("modules.disableAccountingTitle")
      : target?.pnl_enabled === false
        ? t("modules.disablePnlTitle")
        : target?.pnl_enabled
          ? t("modules.enablePnlTitle")
          : t("modules.confirmTitle");

  return (
    <>
      <TopProgress active={busy} variant="top" />

      <main className="settings-page">
        <div className="settings-content space-y-5">
          <section className="settings-panel overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="settings-panel-heading border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">{t("modules.cashFlowSection")}</h2>
              <p className="mt-1 text-[12px] leading-5 text-gray-500">{t("modules.descriptionCashFlow")}</p>
            </div>
            <div className="flex flex-col">
              <div className="settings-row settings-row-static flex items-center justify-between gap-5 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("modules.cashFlow")}</p>
                  <p className="mt-1 text-[13px] font-medium text-gray-900">{t("modules.alwaysOn")}</p>
                </div>
                <Badge tone="success" variant="outline" dot>
                  {t("modules.active")}
                </Badge>
              </div>
            </div>
          </section>

          <section className="settings-panel overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="settings-panel-heading border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">{t("modules.optionalSection")}</h2>
              <p className="mt-1 text-[12px] leading-5 text-gray-500">{t("modules.intro")}</p>
            </div>

            <div className="flex flex-col">
              <div className="settings-row settings-row-static flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("modules.accounting")}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge
                      tone={accounting.enabled ? (accounting.operational ? "success" : "warning") : "neutral"}
                      variant="outline"
                      dot
                    >
                      {accounting.enabled
                        ? accounting.operational
                          ? t("modules.accountingOperational")
                          : t("modules.accountingNeedsSetup")
                        : t("modules.off")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-gray-500">{t("modules.descriptionAccounting")}</p>
                </div>
                <div className="settings-row-actions flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {accounting.enabled ? (
                    <>
                      <Link className={actionLinkClass} to="/b/accounting/overview">
                        {t("modules.openAccounting")}
                      </Link>
                      {accounting.can_disable ? (
                        <Button size="xs" variant="secondary" onClick={() => openDialog({ accounting_enabled: false })}>
                          {t("modules.disable")}
                        </Button>
                      ) : null}
                    </>
                  ) : accounting.can_enable ? (
                    <Button size="xs" variant="secondary" onClick={() => openDialog({ accounting_enabled: true })}>
                      {t("modules.enable")}
                    </Button>
                  ) : (
                    <span className="text-[12px] text-gray-500">
                      {features.can_manage ? t("modules.unavailable") : t("modules.noPermission")}
                    </span>
                  )}
                </div>
              </div>

              <div className="settings-row settings-row-static flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("modules.pnl")}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone={pnl.enabled ? "success" : "neutral"} variant="outline" dot>
                      {pnl.enabled ? t(`sources.${pnl.source_mode}.short`) : t("modules.off")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-gray-500">{t("modules.descriptionPnl")}</p>
                  {pnl.enabled ? (
                    <p className="mt-1 text-[12px] leading-5 text-gray-500">
                      {t("modules.pnlDisclosure", { version: pnl.mapping_version })}
                    </p>
                  ) : null}
                </div>
                <div className="settings-row-actions flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {pnl.enabled ? (
                    <>
                      <Link className={actionLinkClass} to="/b/pnl">
                        {t("modules.openPnl")}
                      </Link>
                      <Link className={actionLinkClass} to="/b/pnl/configuration">
                        {t("modules.configurePnl")}
                      </Link>
                      {pnl.can_disable ? (
                        <Button size="xs" variant="secondary" onClick={() => openDialog({ pnl_enabled: false })}>
                          {t("modules.disable")}
                        </Button>
                      ) : null}
                    </>
                  ) : pnl.can_enable ? (
                    <Button size="xs" variant="secondary" onClick={() => openDialog({ pnl_enabled: true })}>
                      {t("modules.enable")}
                    </Button>
                  ) : (
                    <span className="text-[12px] text-gray-500">
                      {features.can_manage ? t("modules.unavailable") : t("modules.noPermission")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {!features.can_manage ? (
            <p className="px-1 text-[12px] leading-5 text-gray-500">{t("modules.noPermission")}</p>
          ) : null}
        </div>
      </main>

      <FloatingDialog
        isOpen={!!target}
        title={dialogTitle}
        closeLabel={t("modules.cancel")}
        onClose={closeDialog}
        busy={busy}
        width={520}
        height={520}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={closeDialog}>
              {t("modules.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || !password || (needsGapAcknowledgement && !acknowledgeGap)}
              isLoading={busy}
            >
              {t("modules.confirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {needsGapAcknowledgement ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[12px] leading-5 text-amber-800">
              <p>
                {t("modules.postingGapWarning", {
                  count: accounting.disable_blockers.posted_journals ?? 0,
                })}
              </p>
              <label className="mt-3 flex items-start gap-2">
                <Checkbox
                  checked={acknowledgeGap}
                  onChange={(event) => setAcknowledgeGap(event.target.checked)}
                  disabled={busy}
                />
                <span>{t("modules.acknowledgeGap")}</span>
              </label>
            </div>
          ) : null}

          {target?.accounting_enabled === true ? (
            <p className="text-[12px] leading-5 text-gray-600">{t("modules.enableAccountingHint")}</p>
          ) : null}

          <Input
            kind="text"
            type="password"
            label={t("modules.password")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            disabled={busy}
          />
          <Input
            kind="text"
            label={t("modules.reason")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("modules.reasonPlaceholder")}
            disabled={busy}
          />
        </div>
      </FloatingDialog>

      <Snackbar
        open={snack != null}
        message={snack?.message}
        severity={snack?.severity}
        onClose={() => setSnack(null)}
      />
    </>
  );
}

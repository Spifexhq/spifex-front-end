import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { FinancialFeaturesResponse } from "@/models/finance/profitLoss";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { PreferenceRow as Row, PreferenceSection as Section } from "@/shared/ui/Settings/PreferenceSection";

type Target = {
  accounting_enabled?: boolean;
  pnl_enabled?: boolean;
};

type Snack =
  | { message: string; severity: "success" | "error" | "warning" | "info" }
  | null;

export default function FinancialModulesSettings() {
  const { t } = useTranslation("profitLoss");
  const { handleInitUser } = useAuthContext();
  const [features, setFeatures] = useState<FinancialFeaturesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Target | null>(null);
  const [password, setPassword] = useState("");
  const [acknowledgeGap, setAcknowledgeGap] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getFinancialFeatures();
      setFeatures(response.data);
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("modules.loadError")), severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = (next: Target) => {
    setTarget(next);
    setPassword("");
    setReason("");
    setAcknowledgeGap(false);
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

  if (loading || !features) return <TopProgress active variant="center" />;

  const accounting = features.accounting;
  const pnl = features.pnl;
  const needsGapAcknowledgement =
    target?.accounting_enabled === false && accounting.requires_disable_acknowledgement;

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-5">
      <Card padding="compact">
        <p className="text-[13px] leading-5 text-gray-700">{t("modules.intro")}</p>
      </Card>

      <Section title={t("modules.cashFlowSection")}>
        <Row
          label={t("modules.cashFlow")}
          value={t("modules.alwaysOn")}
          action={<span className="text-xs font-medium text-emerald-700">{t("modules.active")}</span>}
        />
      </Section>

      <Section title={t("modules.optionalSection")}>
        <Row
          label={t("modules.accounting")}
          value={
            accounting.enabled
              ? accounting.operational
                ? t("modules.accountingOperational")
                : t("modules.accountingNeedsSetup")
              : t("modules.off")
          }
          action={
            accounting.enabled ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link className="text-xs font-medium text-sky-700 hover:underline" to="/b/accounting/overview">
                  {t("modules.openAccounting")}
                </Link>
                {accounting.can_disable && (
                  <Button size="sm" variant="secondary" onClick={() => choose({ accounting_enabled: false })}>
                    {t("modules.disable")}
                  </Button>
                )}
              </div>
            ) : accounting.can_enable ? (
              <Button size="sm" onClick={() => choose({ accounting_enabled: true })}>
                {t("modules.enable")}
              </Button>
            ) : (
              <span className="text-xs text-gray-500">{features.can_manage ? t("modules.unavailable") : t("modules.noPermission")}</span>
            )
          }
        />
        <Row
          label={t("modules.pnl")}
          value={
            pnl.enabled
              ? t(`sources.${pnl.source_mode}.label`)
              : t("modules.off")
          }
          action={
            pnl.enabled ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link className="text-xs font-medium text-sky-700 hover:underline" to="/b/pnl">
                  {t("modules.openPnl")}
                </Link>
                <Link className="text-xs font-medium text-sky-700 hover:underline" to="/b/pnl/configuration">
                  {t("modules.configurePnl")}
                </Link>
                {pnl.can_disable && (
                  <Button size="sm" variant="secondary" onClick={() => choose({ pnl_enabled: false })}>
                    {t("modules.disable")}
                  </Button>
                )}
              </div>
            ) : pnl.can_enable ? (
              <Button size="sm" onClick={() => choose({ pnl_enabled: true })}>
                {t("modules.enable")}
              </Button>
            ) : (
              <span className="text-xs text-gray-500">{features.can_manage ? t("modules.unavailable") : t("modules.noPermission")}</span>
            )
          }
        />
        {pnl.enabled && (
          <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs leading-5 text-gray-600">
            {t("modules.pnlDisclosure", { version: pnl.mapping_version })}
          </div>
        )}
      </Section>

      {target && (
        <Section title={target.accounting_enabled === false ? t("modules.disableAccountingTitle") : target.pnl_enabled === false ? t("modules.disablePnlTitle") : t("modules.confirmTitle")}>
          <div className="space-y-4 px-5 py-4">
            {needsGapAcknowledgement && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <p>
                  {t("modules.postingGapWarning", {
                    count: accounting.disable_blockers.posted_journals ?? 0,
                  })}
                </p>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={acknowledgeGap}
                    onChange={(event) => setAcknowledgeGap(event.target.checked)}
                  />
                  <span>{t("modules.acknowledgeGap")}</span>
                </label>
              </div>
            )}
            {target.accounting_enabled === true && (
              <p className="text-xs leading-5 text-gray-600">{t("modules.enableAccountingHint")}</p>
            )}
            <Input
              type="password"
              label={t("common:labels.currentPassword", { defaultValue: "Current password" })}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <Input
              label={t("modules.reason")}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("modules.reasonPlaceholder")}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setTarget(null)} disabled={busy}>
                {t("common:actions.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                onClick={() => void submit()}
                isLoading={busy}
                disabled={!password || (needsGapAcknowledgement && !acknowledgeGap)}
              >
                {t("modules.confirm")}
              </Button>
            </div>
          </div>
        </Section>
      )}

      <Snackbar
        open={snack != null}
        message={snack?.message}
        severity={snack?.severity}
        onClose={() => setSnack(null)}
      />
    </div>
  );
}

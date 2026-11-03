import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { useAccountingSetup } from "./useAccountingSetup";
import { accountingRouteAllowed } from "./setupNavigation";

export default function AccountingRouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { t } = useTranslation("accountingSettings");
  const { status, loading, error, refresh } = useAccountingSetup();
  if (loading && !status) return <PageSkeleton rows={6} />;
  if (error || !status) return <div role="alert" className="accounting-state">
    <h2>{t("setupFlow.loadError")}</h2><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>{t("redesign.retry")}</Button>
  </div>;
  const page = pathname.split("/")[3] || "overview";
  if (!accountingRouteAllowed(status, page)) return <div className="accounting-state" aria-busy={loading}>
    <h2>{t("setupFlow.blockedTitle")}</h2><p>{t("setupFlow.blockedDescription")}</p>
    <Link className="accounting-link" to={`/settings/accounting/setup/${status.current_phase}`}>{t("setupFlow.continue")}</Link>
  </div>;
  return children;
}

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
  if (error || !status) return <div role="alert" className="rounded-lg border border-dashed border-gray-300 p-6 text-[13px] text-gray-500 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-700 [&_p]:my-3 [&_p]:leading-6">
    <h2>{t("setupFlow.loadError")}</h2><p>{error}</p><Button variant="outline" onClick={() => void refresh()}>{t("redesign.retry")}</Button>
  </div>;
  const page = pathname.split("/")[2] || "overview";
  if (!accountingRouteAllowed(status, page)) return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-[13px] text-gray-500 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-700 [&_p]:my-3 [&_p]:leading-6" aria-busy={loading}>
    <h2>{t("setupFlow.blockedTitle")}</h2><p>{t("setupFlow.blockedDescription")}</p>
    <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline underline-offset-4" to={`/accounting/setup/${status.current_phase}`}>{t("setupFlow.continue")}</Link>
  </div>;
  return children;
}

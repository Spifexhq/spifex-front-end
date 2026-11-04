import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import BanksTable from "@/components/Table/BanksTable";
import InfoTooltip from "@/shared/ui/InfoTooltip";
import Button from "@/shared/ui/Button";
import type { EntryFilters } from "@/models/components/filterBar";
import { useActivityMetrics } from "./useActivityMetrics";
export type { KpiItem } from "./useActivityMetrics";

export interface KpiCardsProps {
  selectedBankIds?: (string | number)[];
  filters?: EntryFilters;
  contextSettlement: boolean;
  refreshToken?: number;
  banksRefreshKey?: number;
}

/** One quiet summary strip. Bank details expand below it without moving the metrics. */
export default function KpiCards(props: KpiCardsProps) {
  const { t } = useTranslation("kpiCards");
  const navigate = useNavigate();
  const auth = useAuthContext();
  const canView = (permission: string) => auth.isOwner || auth.isSuperUser || auth.permissions.includes(permission);
  const showBanks = canView("view_bank");
  const showMetrics = canView(props.contextSettlement ? "view_settlement_kpis" : "view_cash_flow_kpis");
  const { metrics, loading, error, retry } = useActivityMetrics({ ...props, enabled: showMetrics });
  const [expanded, setExpanded] = useState(false);
  if (!showBanks && !showMetrics) return null;

  return (
    <section aria-label={t("overview.title")} className="min-w-0">
      <div className="flex items-center gap-1 px-4 pt-3 sm:px-5">
        <h2 className="text-xs font-semibold text-gray-600">{t("overview.title")}</h2>
        <InfoTooltip label={t("overview.scopeLabel")}>
          {t(props.contextSettlement ? "overview.settledScope" : "overview.cashflowScope")}
        </InfoTooltip>
      </div>
      <div className={`grid ${showBanks && showMetrics ? "grid-cols-2 xl:grid-cols-4" : showMetrics ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1"}`}>
        {showBanks && <BanksTable expanded={expanded} onExpandedChange={setExpanded}
          selectedBankIds={props.selectedBankIds} active refreshKey={props.banksRefreshKey}
          onGoToBanks={() => navigate("/settings/banks")} />}
        {showMetrics && (error ? (
          <div role="status" className="col-span-full flex flex-wrap items-center justify-between gap-2 px-5 py-4 xl:col-span-3">
            <span className="text-xs text-red-700">{t("overview.loadError")}</span>
            <Button variant="outline" size="xs" onClick={retry}>{t("overview.retry")}</Button>
          </div>
        ) : metrics.map((metric) => (
          <div key={metric.key} aria-busy={loading} className="min-w-0 border-l border-gray-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-1 text-xs leading-5 text-gray-500"><span>{metric.label}</span><span className="inline-flex sm:hidden"><InfoTooltip label={metric.label}>{metric.hint}{metric.delta ? ` · ${metric.delta.value}` : ""}</InfoTooltip></span></div>
            <div className="mt-1 whitespace-nowrap text-base font-semibold leading-7 tracking-tight text-gray-900 tabular-nums sm:text-2xl">
              {loading ? <span className="text-gray-300">—</span> : metric.value}
            </div>
            {metric.delta && !loading && <div className={`mt-1 hidden text-[11px] font-medium sm:block ${metric.delta.positive ? "text-emerald-700" : "text-rose-700"}`}>{metric.delta.value}</div>}
            {metric.hint && <p className="mt-1 hidden text-[11px] leading-4 text-gray-500 sm:block">{loading ? t("loading") : metric.hint}</p>}
          </div>
        )))}
      </div>
    </section>
  );
}

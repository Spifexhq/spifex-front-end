import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, CalendarDays, Landmark, Route } from "lucide-react";
import { useAccountingSetup } from "../setup/useAccountingSetup";
import SetupProgress from "../setup/SetupProgress";
import SetupIssues from "../setup/SetupIssues";

export default function AccountingOverviewPage() {
  const { t } = useTranslation("accountingSettings");
  const { status } = useAccountingSetup();
  if (!status) return null;
  const optional = [
    { page: "periods", Icon: CalendarDays, description: "periodGuidance" },
    { page: "bank-mappings", Icon: Landmark, description: "bankGuidance" },
    { page: "posting-policies", Icon: Route, description: "policyGuidance" },
  ];
  return <section className="space-y-6">
    <div className="accounting-setup-heading"><div><p className="accounting-eyebrow">{t("setupFlow.workspace")}</p><h2>{t(status.operational ? "setupFlow.activeTitle" : "setupFlow.setupTitle")}</h2><p>{t("redesign.overviewDescription")}</p></div><span className={`accounting-status ${status.operational ? "is-active" : ""}`}>{t(`setupFlow.states.${status.status}`)}</span></div>
    <div className="accounting-card space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">{t("setupFlow.progress")}</h3><span className="text-xs text-gray-500">{t("setupFlow.completedCount", { count: status.steps.filter(step => step.complete).length, total: status.steps.length })}</span></div><SetupProgress /><div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4"><p className="text-xs text-gray-500">{t("setupFlow.validationSource")}</p><Link className="accounting-primary-link" to={`/settings/accounting/setup/${status.current_phase}`}>{t(status.operational ? "setupFlow.reviewSetup" : "setupFlow.continue")}<ArrowRight size={14} /></Link></div></div>
    <SetupIssues />
    <div><p className="accounting-eyebrow mb-3">{t("setupFlow.optionalTitle")}</p><div className="grid gap-4 lg:grid-cols-3">{optional.map(({ page, Icon, description }) => <article key={page} className="accounting-card"><Icon size={18} className="mb-4 text-gray-500" /><h3 className="text-sm font-semibold">{t(`setupFlow.optional.${page}`)}</h3><p className="my-3 text-xs leading-6 text-gray-500">{t(`setupFlow.${description}`)}</p>{status.can_activate ? <Link className="accounting-link" to={`/settings/accounting/${page}`}>{t("common.open")}<ArrowRight size={13} /></Link> : <span className="text-xs text-gray-400">{t("setupFlow.afterBooks")}</span>}</article>)}</div></div>
    <div className="accounting-card flex flex-wrap items-start justify-between gap-5"><div className="max-w-2xl"><BookOpen size={18} className="mb-3 text-gray-500" /><h3 className="text-sm font-semibold">{t("redesign.howTitle")}</h3><p className="mt-2 text-xs leading-6 text-gray-500">{t("redesign.howDescription")}</p><p className="mt-2 text-xs leading-6 text-gray-500">{t("setupFlow.openingGuidance")}</p></div><div className="flex flex-wrap gap-4">{["journals", "reconciliation", "correlation"].map(page => <Link key={page} className="accounting-link" to={`/settings/accounting/${page}`}>{t(`nav.${page}`)}<ArrowRight size={13} /></Link>)}</div></div>
  </section>;
}

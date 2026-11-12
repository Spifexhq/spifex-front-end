import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, CalendarDays, Landmark, Route } from "lucide-react";
import Card from "@/shared/ui/Card";
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
  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-5 [&_h2]:mt-1.5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p:not(:first-child)]:mt-2 [&_p:not(:first-child)]:max-w-2xl [&_p:not(:first-child)]:text-[13px] [&_p:not(:first-child)]:leading-6 [&_p:not(:first-child)]:text-gray-500"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("setupFlow.workspace")}</p><h2>{t(status.operational ? "setupFlow.activeTitle" : "setupFlow.setupTitle")}</h2><p>{t("redesign.overviewDescription")}</p></div><span className={`inline-flex shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 ${status.operational ? "border-emerald-200! bg-emerald-50! text-emerald-800!" : ""}`}>{t(`setupFlow.states.${status.status}`)}</span></div>
    <Card as="div" padding="default" className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">{t("setupFlow.progress")}</h3><span className="text-xs text-gray-500">{t("setupFlow.completedCount", { count: status.steps.filter(step => step.complete).length, total: status.steps.length })}</span></div><SetupProgress /><div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4"><p className="text-xs text-gray-500">{t("setupFlow.validationSource")}</p><Link className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-gray-50" to={`/accounting/setup/${status.current_phase}`}>{t(status.operational ? "setupFlow.reviewSetup" : "setupFlow.continue")}<ArrowRight size={15} aria-hidden="true" /></Link></div></Card>
    <SetupIssues />
    <div className="grid gap-3 sm:grid-cols-2">{["journals", "chart"].map(page => <Link key={page} to={`/accounting/${page}`} className="group flex items-center justify-between rounded-lg border border-gray-200 p-5 transition-colors hover:border-gray-300 hover:bg-gray-50"><div><BookOpen size={18} className="mb-3 text-slate-500" aria-hidden="true" /><h3 className="font-semibold text-slate-800">{t(`nav.${page}`)}</h3></div><ArrowRight size={18} className="text-gray-400 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" /></Link>)}</div>
    <div><p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-3">{t("setupFlow.optionalTitle")}</p><div className="grid gap-4 lg:grid-cols-3">{optional.map(({ page, Icon, description }) => <Card as="article" key={page} padding="default"><Icon size={18} className="mb-4 text-gray-500" aria-hidden="true" /><h3 className="text-sm font-semibold">{t(`setupFlow.optional.${page}`)}</h3><p className="my-3 text-xs leading-6 text-gray-500">{t(`setupFlow.${description}`)}</p>{status.can_activate ? <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline underline-offset-4" to={`/accounting/${page}`}>{t("common.open")}<ArrowRight size={13} aria-hidden="true" /></Link> : <span className="text-xs text-gray-500">{t("setupFlow.afterBooks")}</span>}</Card>)}</div></div>
    <Card as="div" padding="default" className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-2xl"><BookOpen size={18} className="mb-3 text-gray-500" aria-hidden="true" /><h3 className="text-sm font-semibold">{t("redesign.howTitle")}</h3><p className="mt-2 text-xs leading-6 text-gray-500">{t("redesign.howDescription")}</p><p className="mt-2 text-xs leading-6 text-gray-500">{t("setupFlow.openingGuidance")}</p></div><div className="flex flex-wrap gap-4">{["journals", "reconciliation", "correlation"].map(page => <Link key={page} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline underline-offset-4" to={`/accounting/${page}`}>{t(`nav.${page}`)}<ArrowRight size={13} aria-hidden="true" /></Link>)}</div></Card>
  </section>;
}

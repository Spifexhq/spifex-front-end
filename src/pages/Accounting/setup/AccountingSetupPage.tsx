import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "@/api/requests";
import Button from "@/shared/ui/Button";
import type { SetupPhase } from "@/models/settings/accountingSetup";
import { useAccountingSetup } from "./useAccountingSetup";
import SetupProgress from "./SetupProgress";
import SetupIssues from "./SetupIssues";
import ProfileConfiguration from "./ProfileConfiguration";
import ChartOfAccountsPage from "../chart/ChartOfAccountsPage";
import AccountingBooksPage from "../pages/AccountingBooksPage";

const phases: SetupPhase[] = ["profile", "chart", "books", "review"];

export default function AccountingSetupPage() {
  const { t } = useTranslation("accountingSettings");
  const { phase: parameter } = useParams();
  const { status, refresh, canManage } = useAccountingSetup();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!status) return null;
  const phase = phases.includes(parameter as SetupPhase) ? parameter as SetupPhase : status.current_phase;
  const step = status.steps.find(item => item.key === phase)!;
  const next = phases[phases.indexOf(phase) + 1];
  const proceed = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (phase === "profile" && canManage) await api.startAccountingSetup();
      if (phase === "review") await api.activateAccounting(status.revision);
      await refresh();
      if (next) navigate(`/accounting/setup/${next}`);
    } catch (cause) {
      setError(apiErrorMessage(cause, t("setupFlow.actionError")));
      await refresh();
    } finally { setBusy(false); }
  };
  return <section className="space-y-6">
    <SetupProgress current={phase} />
    <div className="flex flex-wrap items-start justify-between gap-5 [&_h2]:mt-1.5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p:not(:first-child)]:mt-2 [&_p:not(:first-child)]:max-w-2xl [&_p:not(:first-child)]:text-[13px] [&_p:not(:first-child)]:leading-6 [&_p:not(:first-child)]:text-gray-500"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{t("setupFlow.step", { current: phases.indexOf(phase) + 1, total: phases.length })}</p><h2>{t(`setupFlow.phases.${phase}`)}</h2><p>{t(`setupFlow.descriptions.${phase}`)}</p></div><span className={`inline-flex shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 ${status.operational ? "border-emerald-200! bg-emerald-50! text-emerald-800!" : ""}`}>{t(`setupFlow.states.${status.status}`)}</span></div>
    <SetupIssues />
    {!step.available ? <div className="rounded-lg border border-dashed border-gray-300 p-6 text-[13px] text-gray-500 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-700 [&_p]:my-3 [&_p]:leading-6"><h3>{t("setupFlow.blockedTitle")}</h3><p>{t("setupFlow.blockedDescription")}</p><Link className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline underline-offset-4" to={`/accounting/setup/${status.current_phase}`}>{t("setupFlow.continue")}</Link></div> : <>
      {phase === "profile" && <ProfileConfiguration />}
      {phase === "chart" && <ChartOfAccountsPage />}
      {phase === "books" && <AccountingBooksPage />}
      {phase === "review" && <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs md:p-5 space-y-5"><div className="flex items-start gap-3"><CheckCircle2 size={20} className="shrink-0 text-emerald-600" /><div><h3 className="font-semibold">{t(status.operational ? "setupFlow.activeTitle" : "setupFlow.readyTitle")}</h3><p className="mt-1 text-xs leading-6 text-gray-500">{t("setupFlow.activationConsequences")}</p></div></div><div className="grid gap-4 sm:grid-cols-2">{["periods", "bank-mappings", "posting-policies", "journals"].map(page => <Link key={page} to={`/accounting/${page}`} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 p-3 text-xs text-slate-600 hover:border-gray-300 hover:bg-gray-50"><span>{t(`setupFlow.optional.${page}`)}</span><ArrowRight size={14} /></Link>)}</div><p className="text-xs leading-6 text-gray-500">{t("setupFlow.optionalGuidance")}</p></div>}
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-5"><Link className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline underline-offset-4" to="/accounting/overview">{t("setupFlow.backOverview")}</Link>{next ? <Button disabled={busy || !step.complete} onClick={() => void proceed()}>{t("setupFlow.continueStep")}<ArrowRight size={14} /></Button> : !status.operational && <Button disabled={busy || !canManage || !status.can_activate} onClick={() => void proceed()}>{t(busy ? "setupFlow.activating" : "setupFlow.activate")}</Button>}</footer>
      {!canManage && !status.operational && <p className="text-xs text-gray-500">{t("setupFlow.requestAdmin")}</p>}
    </>}
  </section>;
}

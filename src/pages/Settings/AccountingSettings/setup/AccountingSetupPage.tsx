import { accountingErrorMessage } from "../accountingError";
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
      if (next) navigate(`/settings/accounting/setup/${next}`);
    } catch (cause) {
      setError(accountingErrorMessage(cause, t("setupFlow.actionError")));
      await refresh();
    } finally { setBusy(false); }
  };
  return <section className="space-y-6">
    <SetupProgress current={phase} />
    <div className="accounting-setup-heading"><div><p className="accounting-eyebrow">{t("setupFlow.step", { current: phases.indexOf(phase) + 1, total: phases.length })}</p><h2>{t(`setupFlow.phases.${phase}`)}</h2><p>{t(`setupFlow.descriptions.${phase}`)}</p></div><span className={`accounting-status ${status.operational ? "is-active" : ""}`}>{t(`setupFlow.states.${status.status}`)}</span></div>
    <SetupIssues />
    {!step.available ? <div className="accounting-state"><h3>{t("setupFlow.blockedTitle")}</h3><p>{t("setupFlow.blockedDescription")}</p><Link className="accounting-link" to={`/settings/accounting/setup/${status.current_phase}`}>{t("setupFlow.continue")}</Link></div> : <>
      {phase === "profile" && <ProfileConfiguration />}
      {phase === "chart" && <ChartOfAccountsPage />}
      {phase === "books" && <AccountingBooksPage />}
      {phase === "review" && <div className="accounting-card space-y-5"><div className="flex items-start gap-3"><CheckCircle2 size={20} className="shrink-0 text-emerald-600" /><div><h3 className="font-semibold">{t(status.operational ? "setupFlow.activeTitle" : "setupFlow.readyTitle")}</h3><p className="mt-1 text-xs leading-6 text-gray-500">{t("setupFlow.activationConsequences")}</p></div></div><div className="grid gap-4 sm:grid-cols-2">{["periods", "bank-mappings", "posting-policies", "journals"].map(page => <Link key={page} to={`/settings/accounting/${page}`} className="accounting-optional-link"><span>{t(`setupFlow.optional.${page}`)}</span><ArrowRight size={14} /></Link>)}</div><p className="text-xs leading-6 text-gray-500">{t("setupFlow.optionalGuidance")}</p></div>}
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <footer className="accounting-setup-actions"><Link className="accounting-link" to="/settings/accounting/overview">{t("setupFlow.backOverview")}</Link>{next ? <Button disabled={busy || !step.complete} onClick={() => void proceed()}>{t("setupFlow.continueStep")}<ArrowRight size={14} /></Button> : !status.operational && <Button disabled={busy || !canManage || !status.can_activate} onClick={() => void proceed()}>{t(busy ? "setupFlow.activating" : "setupFlow.activate")}</Button>}</footer>
      {!canManage && !status.operational && <p className="text-xs text-gray-500">{t("setupFlow.requestAdmin")}</p>}
    </>}
  </section>;
}

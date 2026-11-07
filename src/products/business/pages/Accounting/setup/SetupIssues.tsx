import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAccountingSetup } from "./useAccountingSetup";

export default function SetupIssues() {
  const { t } = useTranslation("accountingSettings");
  const { status } = useAccountingSetup();
  const issues = status?.steps.filter(step => step.available && !step.complete).flatMap(step => step.issues.map(issue => ({ ...issue, phase: step.key }))) ?? [];
  if (!issues.length) return null;
  return <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900" role="status"><p className="font-medium">{t("setupFlow.requiredActions")}</p><ul className="mt-2 space-y-1.5">{issues.map((issue, index) => <li key={`${issue.code}:${issue.account_id ?? index}`}><Link to={issue.account_id ? "/accounting/chart" : `/accounting/setup/${issue.phase}`} className="underline decoration-gray-300 underline-offset-2">{issue.account_code && <b>{issue.account_code}: </b>}{t(`setupFlow.issues.${issue.code}`, { defaultValue: t("setupFlow.blockedDescription") })}</Link></li>)}</ul></div>;
}

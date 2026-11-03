import { Check, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SetupPhase } from "@/models/settings/accountingSetup";
import { useAccountingSetup } from "./useAccountingSetup";

export default function SetupProgress({ current }: { current?: SetupPhase }) {
  const { t } = useTranslation("accountingSettings");
  const { status } = useAccountingSetup();
  return <ol className="accounting-steps" aria-label={t("setupFlow.progress")}>
    {status?.steps.map((step, index) => <li key={step.key} data-state={step.complete ? "complete" : !step.available ? "blocked" : current === step.key ? "current" : "pending"}>
      {step.available ? <Link to={`/settings/accounting/setup/${step.key}`} aria-current={current === step.key ? "step" : undefined}>
        <span className="accounting-step-number">{step.complete ? <Check size={14} /> : index + 1}</span><span>{t(`setupFlow.phases.${step.key}`)}<small>{t(step.complete ? "setupFlow.complete" : "setupFlow.pending")}</small></span>
      </Link> : <span className="accounting-step-disabled"><span className="accounting-step-number"><LockKeyhole size={12} /></span><span>{t(`setupFlow.phases.${step.key}`)}<small>{t("setupFlow.blocked")}</small></span></span>}
    </li>)}
  </ol>;
}

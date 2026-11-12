import { Check, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SetupPhase } from "@/models/settings/accountingSetup";
import { useAccountingSetup } from "./useAccountingSetup";

export default function SetupProgress({ current }: { current?: SetupPhase }) {
  const { t } = useTranslation("accountingSettings");
  const { status } = useAccountingSetup();
  return <ol className="grid list-none grid-cols-2 gap-2 p-0 lg:grid-cols-4" aria-label={t("setupFlow.progress")}>
    {status?.steps.map((step, index) => <li className="group min-w-0 rounded-lg border border-gray-200 bg-white data-[state=current]:border-slate-400 data-[state=blocked]:bg-gray-50" key={step.key} data-state={step.complete ? "complete" : !step.available ? "blocked" : current === step.key ? "current" : "pending"}>
      {step.available ? <Link className="flex h-full items-center gap-2.5 rounded-lg p-3 text-xs font-medium text-slate-600 hover:bg-gray-50 aria-[current=step]:ring-1 aria-[current=step]:ring-slate-400" to={`/accounting/setup/${step.key}`} aria-current={current === step.key ? "step" : undefined}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 text-[11px] group-data-[state=complete]:border-emerald-200 group-data-[state=complete]:bg-emerald-50 group-data-[state=complete]:text-emerald-700">{step.complete ? <Check size={15} aria-hidden="true" /> : index + 1}</span><span>{t(`setupFlow.phases.${step.key}`)}<small className="mt-1 block text-[10px] font-normal text-gray-500">{t(step.complete ? "setupFlow.complete" : "setupFlow.pending")}</small></span>
      </Link> : <span className="flex h-full items-center gap-2.5 p-3 text-xs text-gray-500"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 text-[11px] group-data-[state=complete]:border-emerald-200 group-data-[state=complete]:bg-emerald-50 group-data-[state=complete]:text-emerald-700"><LockKeyhole size={13} aria-hidden="true" /></span><span>{t(`setupFlow.phases.${step.key}`)}<small className="mt-1 block text-[10px] font-normal text-gray-500">{t("setupFlow.blocked")}</small></span></span>}
    </li>)}
  </ol>;
}

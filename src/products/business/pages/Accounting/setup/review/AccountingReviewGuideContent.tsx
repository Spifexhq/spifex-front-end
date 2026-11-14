import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, FileText, Landmark, Route } from "lucide-react";

export default function AccountingReviewGuideContent({ onNavigate }: { onNavigate(): void }) {
  const { t } = useTranslation("accountingSettings");
  const navigate = useNavigate();
  const items = [
    { Icon: Route, to: "posting-policies", title: t("redesign.guide.rule", "A category has no accounting rule"), description: t("redesign.guide.ruleDescription", "Choose the payment and receipt accounts for that category in your primary book."), action: t("redesign.guide.ruleAction", "Review category rules") },
    { Icon: Landmark, to: "bank-mappings", title: t("redesign.guide.bank", "A bank is not connected"), description: t("redesign.guide.bankDescription", "Connect the bank used for the payment to an active bank-control account in your primary book."), action: t("redesign.guide.bankAction", "Review bank connections") },
    { Icon: FileText, to: "journals", title: t("redesign.guide.journal", "An accounting entry needs review"), description: t("redesign.guide.journalDescription", "Inspect the journal and its source. Reversing a journal changes accounting only; it does not cancel the payment."), action: t("redesign.guide.journalAction", "Review journals") },
  ];
  const go = (to: string) => { onNavigate(); navigate(`/accounting/${to}`); };
  return <div className="space-y-4">
    <p className="text-[13px] leading-6 text-gray-500">{t("redesign.guide.description", "Start with the issue you see on your cashflow entry. These shortcuts help you find the relevant settings.")}</p>
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {items.map(item => <button key={item.to} type="button" onClick={() => go(item.to)} className="group flex w-full items-start gap-4 border-b border-gray-100 p-4 text-left last:border-0 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-gray-400">
        <span className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-500"><item.Icon size={18} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
          <span className="mt-1 block max-w-2xl text-[13px] leading-6 text-gray-500">{item.description}</span>
          <span className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-700">{item.action}<ArrowRight size={13} className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" /></span>
        </span>
      </button>)}
    </div>
    <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] leading-5 text-gray-500">{t("redesign.guide.notice", "This is a troubleshooting guide. It does not show live exception queues or match bank statements to journals.")}</p>
  </div>;
}

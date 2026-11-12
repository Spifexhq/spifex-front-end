import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Landmark, Route, FileText } from "lucide-react";
export default function AccountingReconciliationPage() {
  const { t } = useTranslation("accountingSettings");
  const items = [
    { Icon: Route, to: "posting-policies", title: t("redesign.guide.rule", "A category has no accounting rule"), description: t("redesign.guide.ruleDescription", "Choose the payment and receipt accounts for that category in your primary book."), action: t("redesign.guide.ruleAction", "Review category rules") },
    { Icon: Landmark, to: "bank-mappings", title: t("redesign.guide.bank", "A bank is not connected"), description: t("redesign.guide.bankDescription", "Connect the bank used for the payment to an active bank-control account in your primary book."), action: t("redesign.guide.bankAction", "Review bank connections") },
    { Icon: FileText, to: "journals", title: t("redesign.guide.journal", "An accounting entry needs review"), description: t("redesign.guide.journalDescription", "Inspect the journal and its source. Reversing a journal changes accounting only; it does not cancel the payment."), action: t("redesign.guide.journalAction", "Review journals") },
  ];
  return <div className="space-y-5">
    <header><p className="mt-2 max-w-2xl text-[13px] leading-6 text-gray-500">{t("redesign.guide.description", "Start with the issue you see on your cashflow entry. These shortcuts help you find the relevant settings.")}</p></header>
    <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500">{t("redesign.guide.notice", "This is a troubleshooting guide. It does not show live exception queues or match bank statements to journals.")}</div>
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">{items.map(item => <Link key={item.to} to={`/accounting/${item.to}`} className="group flex items-start gap-4 border-b border-gray-100 p-5 last:border-0 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-gray-400 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-500"><item.Icon size={18} aria-hidden="true" /></div>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 max-w-2xl text-[13px] leading-6 text-gray-500">{item.description}</p><p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-700">{item.action}<ArrowRight size={13} className="transition-transform group-hover:translate-x-1" aria-hidden="true" /></p></div>
    </Link>)}</div>
  </div>;
}

import { useTranslation } from "react-i18next";
import AnimatedNumber from "@/shared/ui/AnimatedNumber";
import { formatCurrency } from "@/lib";
import type { CashflowBalance } from "../types";

export default function AccountBalancePanel({ data, loading, error, basis = "outstanding" }: { data: CashflowBalance | null; loading: boolean; error: string; basis?: "outstanding" | "settled" }) {
  const { t } = useTranslation("financial");
  if (!data) return error ? <p role="alert" className="rounded-lg border border-red-100 p-3 text-xs text-red-700">{error}</p> : loading ? <div aria-label={t("loading")} className="grid animate-pulse grid-cols-2 gap-3 motion-reduce:animate-none lg:grid-cols-4">{[0, 1, 2, 3].map(key => <div key={key} className="h-24 rounded-xl border border-gray-200 bg-gray-50"/>)}</div> : null;
  const money = (value: number) => formatCurrency(value, data.currency);
  const metrics = basis === "settled"
    ? (["balance", "settled_income", "settled_expense", "settled_net"] as const)
    : (["balance", "pending_income", "pending_expense", "projected_balance"] as const);
  return <section aria-busy={loading} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
    <div className="grid grid-cols-2 lg:grid-cols-4">{metrics.map((key, index) => {
      const value = key === "settled_income" ? data.settled_income : key === "settled_expense" ? data.settled_expense : key === "settled_net" ? data.settled_net : data[key];
      const finalValue = formatCurrency(value ?? "0", data.currency);
      return <div key={key} className={`px-4 py-4 ${index ? "border-l border-gray-100" : ""} ${index > 1 ? "border-t lg:border-t-0" : ""}`}><p className="text-[11px] text-gray-500">{t(key === "balance" ? "totalBalance" : key)}</p><p className={`mt-2 truncate text-xl font-semibold tabular-nums tracking-tight ${key === "pending_income" || key === "settled_income" ? "text-emerald-700" : "text-gray-900"}`}><AnimatedNumber value={Number(value || 0)} format={money} finalValue={finalValue}/></p></div>;
    })}</div>
    <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3"><p className="mb-2 text-[11px] text-gray-500">{t("balanceExplanation")}</p><ul className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1">{data.accounts.map(account => <li key={account.id} className="flex shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs"><span className={`h-1.5 w-1.5 rounded-full ${account.is_active ? "bg-emerald-500" : "bg-gray-300"}`}/><span className="max-w-40 truncate text-gray-500">{account.name}</span><span className="font-medium tabular-nums text-gray-800">{formatCurrency(account.balance, data.currency)}</span></li>)}{!data.accounts.length && <li className="text-xs text-gray-500">{t("noAccounts")}</li>}</ul></div>
    {error && <p role="alert" className="border-t border-red-100 px-4 py-2 text-xs text-red-700">{error}</p>}
  </section>;
}

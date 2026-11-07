import { useTranslation } from "react-i18next";
import AnimatedNumber from "@/shared/ui/AnimatedNumber";
import Sparkline from "@/shared/ui/Sparkline";
import { formatCurrency } from "@/lib";
import type { OverviewData } from "@/models/finance/overview";
import { cumulativeValues, percentageChange } from "./overviewUtils";
export default function OverviewMetrics({ data }: { data: OverviewData }) {
  const { t, i18n } = useTranslation("overview");
  const money = (value: string | number) => formatCurrency(value, data.currency || undefined);
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{(["in","out","net","count"] as const).map((field,index)=>{
        const value=Number(data.metrics?.[field] || 0),previous=Number(data.previous?.[field] || 0),delta=percentageChange(value,previous),positive=delta!=null&&(field==="out" ? delta<=0 : delta>=0);
        return <section key={field} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-1.5"><div className="rounded-lg border border-slate-200/80 bg-white px-4 py-4"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t(`cards.${field}`)}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[25px] font-semibold leading-8 tracking-tight tabular-nums text-slate-950"><AnimatedNumber value={value} format={current=>field==="count" ? current.toLocaleString(i18n.language,{maximumFractionDigits:0}) : money(current)} finalValue={field==="count" ? value.toLocaleString(i18n.language) : money(data.metrics?.[field] || "0")} /></p><Sparkline values={cumulativeValues(data.series,field)} color={["#6366f1","#94a3b8","#10b981","#818cf8"][index]} label={t("sparkline",{metric:t(`cards.${field}`)})}/></div></div><div className="flex min-h-8 flex-wrap items-center gap-2 px-2 pt-1 text-[10px]"><span className={`rounded px-1.5 py-0.5 font-medium ${delta==null||field==="count" ? "bg-slate-100 text-slate-600" : positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{delta==null ? t("noComparison") : `${delta>0?"+":""}${Intl.NumberFormat(i18n.language,{style:"percent",maximumFractionDigits:1}).format(delta)}`}</span><span className="text-slate-400">{t("previousPeriod")}</span></div></section>;
      })}</div>;
}

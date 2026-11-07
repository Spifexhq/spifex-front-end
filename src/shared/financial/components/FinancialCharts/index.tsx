import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useReducedMotion } from "framer-motion";
import type { OverviewData } from "@/models/finance/overview";
import { formatCurrency, formatDateFromISO } from "@/lib";
import InfoTooltip from "@/shared/ui/InfoTooltip";
import SegmentedControl from "@/shared/ui/SegmentedControl";

export default function FinancialCharts({ data, group, onGroup }: {
  data: OverviewData; group: "day"|"week"|"month"; onGroup(group: "day"|"week"|"month"): void;
}) {
  const { t, i18n } = useTranslation("overview"), reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const money = (value: string|number) => formatCurrency(value,data.currency || undefined);
  // Accumulate in minor units to avoid floating-point drift across buckets.
  let periodNetMinor = 0;
  const points = data.series.map(point => {
    periodNetMinor += Math.round(Number(point.net) * 100);
    return { ...point, incoming: Number(point.in), outgoing: Number(point.out), periodNet: periodNetMinor / 100 };
  });
  const expenses = Number(data.metrics?.out || 0);
  const categoriesTotal = data.categories.reduce((sum,item)=>sum+Number(item.amount),0);
  return <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="flex items-center gap-1 text-sm font-semibold text-slate-900">{t("trend")}<InfoTooltip label={t("calculation")}>{t("scope")}</InfoTooltip></h2><p className="mt-1 text-xs text-slate-500">{t(`trendDescriptions.${data.period.basis}`)}</p></div>
        <SegmentedControl<"day" | "week" | "month"> value={group} onChange={onGroup} label={t("groupBy")} items={(["day","week","month"] as const).map(value=>({value,label:t(`groups.${value}`)}))}/>
      </div>
      <div className="relative h-[260px] w-full sm:h-[300px]" role="img" aria-label={t("chartLabel")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{top:12,right:10,left:0,bottom:4}}>
            <defs>
              <linearGradient id={`${id}-receipts`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={.13}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
              <linearGradient id={`${id}-payments`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94a3b8" stopOpacity={.1}/><stop offset="100%" stopColor="#94a3b8" stopOpacity={0}/></linearGradient>
              <linearGradient id={`${id}-period-net`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={.1}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9"/>
            <XAxis dataKey="date" tickFormatter={value=>new Date(`${value}T12:00:00`).toLocaleDateString(i18n.language,{month:"short",day:"numeric"})} tick={{fill:"#94a3b8",fontSize:10}} tickLine={false} axisLine={false} minTickGap={36}/>
            <YAxis width={55} tickFormatter={value=>Intl.NumberFormat(i18n.language,{notation:"compact",maximumFractionDigits:1}).format(value)} tick={{fill:"#94a3b8",fontSize:10}} tickLine={false} axisLine={false}/>
            <Tooltip labelFormatter={value=>formatDateFromISO(String(value))} formatter={(value,name)=>[money(Number(value)),String(name)]} contentStyle={{border:"1px solid #e2e8f0",borderRadius:9,fontSize:12,boxShadow:"0 8px 24px #0f172a0a"}}/>
            <Area type="monotone" dataKey="incoming" name={t("received")} stroke="#6366f1" strokeWidth={2} fill={`url(#${id}-receipts)`} baseValue={0} dot={points.length===1 ? {r:3} : false} activeDot={{r:4}} isAnimationActive={!reduced} animationBegin={0} animationDuration={450} animationEasing="ease-out"/>
            <Area type="monotone" dataKey="outgoing" name={t("paid")} stroke="#94a3b8" strokeWidth={2} fill={`url(#${id}-payments)`} baseValue={0} dot={points.length===1 ? {r:3} : false} activeDot={{r:4}} isAnimationActive={!reduced} animationBegin={0} animationDuration={450} animationEasing="ease-out"/>
            <Area type="monotone" dataKey="periodNet" name={t("periodNetTrend")} stroke="#10b981" strokeWidth={2} fill={`url(#${id}-period-net)`} baseValue={0} dot={points.length===1 ? {r:3} : false} activeDot={{r:4}} isAnimationActive={!reduced} animationBegin={0} animationDuration={450} animationEasing="ease-out"/>
          </AreaChart>
        </ResponsiveContainer>
        {!data.metrics?.count && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><p className="max-w-xs rounded-lg bg-white/90 px-4 py-3 text-center text-sm leading-6 text-slate-500">{t("noActivity")}</p></div>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500"/>{t("received")}</span><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-400"/>{t("paid")}</span><span className="inline-flex items-center gap-1"><span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500"/>{t("periodNetTrend")}<InfoTooltip label={t("periodNetTrend")}>{t("periodNetTrendDescription")}</InfoTooltip></span><span className="ml-auto">{data.currency}</span></div>
    </section>
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-900">{t("spending")}</h2><p className="mt-1 text-xs text-slate-500">{t("spendingDescription")}</p><p className="mb-5 mt-5 text-2xl font-semibold tracking-tight text-slate-900">{money(data.metrics?.out || "0")}</p><div aria-hidden="true" className="mb-6 flex h-2 overflow-hidden rounded-full bg-slate-100">{data.categories.map((item,index)=><div key={item.id} style={{width:`${expenses ? Number(item.amount)/expenses*100 : 0}%`,backgroundColor:["#6366f1","#818cf8","#a5b4fc","#c7d2fe","#94a3b8","#cbd5e1","#e2e8f0","#f1f5f9"][index]}}/>)}</div><ul className="space-y-4">{data.categories.map((item,index)=><li key={item.id} className="flex items-center gap-2.5 text-xs"><span className="h-2 w-2 shrink-0 rounded-sm" style={{backgroundColor:["#6366f1","#818cf8","#a5b4fc","#c7d2fe","#94a3b8","#cbd5e1","#e2e8f0","#f1f5f9"][index]}} /><span className="min-w-0 flex-1 truncate text-slate-600">{item.name || t("uncategorized")}</span><span className="font-medium tabular-nums text-slate-900">{money(item.amount)}</span><span className="w-8 text-right tabular-nums text-slate-400">{expenses ? Math.round(Number(item.amount)/expenses*100) : 0}%</span></li>)}</ul>{!data.categories.length && <p className="py-5 text-sm text-slate-400">{t("noSpending")}</p>}{expenses-categoriesTotal>.01 && <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{t("otherCategories")} · {money((expenses-categoriesTotal).toFixed(2))}</p>}</section>
  </div>;
}

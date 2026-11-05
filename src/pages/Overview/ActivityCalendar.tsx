import { useTranslation } from "react-i18next";
import { formatDateFromISO } from "@/lib";
import type { OverviewData, PeriodPoint } from "@/models/finance/overview";

export default function ActivityCalendar({ data }: { data: OverviewData }) {
  const { t, i18n } = useTranslation("overview");
  const offset = data.activity.length ? (new Date(`${data.activity[0].date}T12:00:00`).getDay()+6)%7 : 0;
  const cells: (PeriodPoint | null)[] = [...Array.from({length:offset},()=>null),...data.activity];
  const maxCount = Math.max(1,...data.activity.map(day=>day.count));
  const total = data.activity.reduce((count,day)=>count+day.count,0);
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-sm font-semibold text-slate-900">{t("activity")}</h2>
    <p className="mt-1 text-xs text-slate-400">{t("activityDescription",{count:data.activity.length})}</p>
    <p className="mb-5 mt-4 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{total.toLocaleString(i18n.language)}<span className="ml-2 text-xs font-normal text-slate-400">{t("transactions")}</span></p>
    <div className="flex gap-3 overflow-x-auto pb-1">
      <div aria-hidden className="grid shrink-0 grid-rows-7 gap-1.5 text-[9px] leading-[14px] text-slate-400">{Array.from({length:7},(_,day)=><span key={day} className="h-3.5">{[0,2,4].includes(day) ? new Date(2024,0,1+day).toLocaleDateString(i18n.language,{weekday:"short"}) : ""}</span>)}</div>
      <div className="grid min-w-max grid-flow-col grid-rows-7 gap-1.5" role="img" aria-label={t("activityLabel")}>
        {cells.map((day,index)=>day ? <div key={day.date} title={`${formatDateFromISO(day.date)} · ${t("transactionsCount",{count:day.count})}`} className="h-3.5 w-3.5 rounded-sm" style={{backgroundColor:day.count ? `rgba(99,102,241,${.2+.8*day.count/maxCount})` : "#f1f5f9"}}/> : <div key={`empty-${index}`} aria-hidden className="h-3.5 w-3.5"/>)}
      </div>
    </div>
    <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-slate-400"><span>{formatDateFromISO(data.activity[0]?.date || data.period.start)} – {formatDateFromISO(data.period.end)}</span><span>{t("less")} <span className="inline-block h-2 w-2 rounded-sm bg-slate-100"/> <span className="inline-block h-2 w-2 rounded-sm bg-indigo-200"/> <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500"/> {t("more")}</span></div>
  </section>;
}

import { usePersonalReadRevision } from "../hooks/usePersonalReadRevision";
import PersonalRecordDialog from "../components/PersonalRecordDialog";
import { readonlyWorkspace } from "../services/personalData";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { personalApi } from "@/products/personal/services/api";
import { useAuthContext } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { PersonalDashboard } from "@/products/personal/types";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import AnimatedNumber from "@/shared/ui/AnimatedNumber";
import FinancialCharts from "@/shared/financial/components/FinancialCharts";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import DataTable from "@/shared/ui/DataTable";
import { today } from "../services/personalData";
export default function PersonalOverview({reports=false}:{reports?:boolean}){
 const {t}=useTranslation("personal"),{organization,permissions,isOwner,isSubscribed}=useAuthContext();const readRevision=usePersonalReadRevision();const access=JSON.stringify([permissions,isOwner,isSubscribed,readRevision,organization?.organization?.lifecycle]);const [createOpen,setCreateOpen]=useState(false);const [start,setStart]=useState(today().slice(0,7)+"-01"),[end,setEnd]=useState(today()),[query,setQuery]=useState({start_date:start,end_date:end}),[group,setGroup]=useState<"day"|"week"|"month">("day"),[snapshot,setSnapshot]=useState<{workspace:string;access:string;data:PersonalDashboard}|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 const id=organization?.organization?.id||"",data=snapshot?.workspace===id&&snapshot.access===access?snapshot.data:null;
 useEffect(()=>{let active=true;setLoading(true);setError("");const fetch=async()=>{for(let attempt=0;;attempt++){try{return await personalApi.dashboard(reports,{...query,group_by:group});}catch(cause){if(!active||attempt>=2||(cause as {code?:string})?.code!=="ERR_CANCELED")throw cause;}}};void fetch().then(result=>{if(active)setSnapshot({workspace:id,access,data:result.data});}).catch(cause=>{if(active)setError(apiErrorMessage(cause,t("error")));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[reports,query,group,id,retry,t,access]);
 const money=(value:string|number)=>formatCurrency(value,data?.currency||undefined);
 if(!data&&loading)return <PageSkeleton rows={7}/>;
 return <div className="space-y-6" aria-busy={loading}><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t(reports?"reports":"overview")}</h1><p className="mt-2 text-sm text-slate-500">{t(reports?"reportsDescription":"overviewDescription")}</p></div><form className="flex flex-wrap items-end gap-2" onSubmit={event=>{event.preventDefault();setQuery({start_date:start,end_date:end});}}><div className="w-36"><Input kind="date" label={t("start_date")} value={start} onValueChange={setStart}/></div><div className="w-36"><Input kind="date" label={t("end_date")} value={end} onValueChange={setEnd}/></div><Button type="submit" variant="outline" disabled={!start||!end||end<start}>{t("apply")}</Button></form></header>
 {!reports&&!readonlyWorkspace(organization?.organization?.lifecycle)&&<div className="flex justify-end"><Button onClick={()=>setCreateOpen(true)}>{t("addTransaction")}</Button></div>}
 {error&&<div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<Button variant="outline" size="xs" onClick={()=>setRetry(n=>n+1)}>{t("retry")}</Button></div>}
 {data&&<><div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{([["balance",data.available_balance],["income",data.metrics?.in||"0"],["expense",data.metrics?.out||"0"],["net",data.metrics?.net||"0"]] as const).map(([label,value])=><section key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-5"><p className="text-xs text-slate-500">{t(label)}</p><p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900"><AnimatedNumber value={Number(value||0)} format={money} finalValue={money(value||"0")}/></p></section>)}</div>
 {data.balances_by_currency.length>1&&<div className="flex flex-wrap gap-4 text-xs text-slate-500">{data.balances_by_currency.map(item=><span key={item.currency}>{item.currency}: {formatCurrency(item.balance,item.currency)}</span>)}</div>}
 <FinancialCharts data={data} group={group} onGroup={setGroup}/>
 {!reports&&<><div className="grid gap-5 lg:grid-cols-2">{([['budgets',data.budgets],['goals',data.goals]] as const).map(([kind,items])=><section key={kind} className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">{t(kind)}</h2><Link to={`/personal/${kind}`} className="text-xs text-slate-500 hover:text-slate-900">{t("viewAll")}</Link></div>{!items.length?<p className="py-4 text-xs text-slate-500">{t("empty")}</p>:<ul className="space-y-5">{items.slice(0,4).map(item=><li key={item.id}><div className="flex justify-between gap-4 text-xs"><span className="truncate text-slate-700">{item.name}</span><span className="tabular-nums text-slate-500">{Math.round(Number(item.progress)||0)}%</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${Math.max(0,Math.min(100,Number(item.progress)||0))}%`}}/></div></li>)}</ul>}</section>)}</div>
 <section><h2 className="mb-4 text-sm font-semibold text-slate-900">{t("recent")}</h2><DataTable items={data.recent} columns={[{key:"name",label:t("description"),render:row=>row.description},{key:"date",label:t("due_date"),render:row=>row.date},{key:"amount",mobile:true,label:t("amount"),render:row=>money(row.amount)}]} emptyLabel={t("empty")} pagination={false} inspectable={false}/></section>
 <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold text-slate-900">{t("upcoming")}</h2><ul className="mt-4 divide-y divide-slate-100">{data.upcoming.map(item=><li key={item.id} className="flex items-center justify-between gap-4 py-3 text-xs"><div><p className="font-medium text-slate-700">{item.description}</p><p className="mt-1 text-slate-500">{item.date}</p></div><span className="tabular-nums">{money(item.amount)}</span></li>)}</ul>{!data.upcoming.length&&<p className="mt-4 text-xs text-slate-500">{t("empty")}</p>}</section></>}
 </>}
 {createOpen&&!readonlyWorkspace(organization?.organization?.lifecycle)&&<PersonalRecordDialog kind="transactions" currency={data?.currency||"EUR"} onClose={()=>setCreateOpen(false)} onSaved={()=>setRetry(value=>value+1)}/>}
 </div>;
}

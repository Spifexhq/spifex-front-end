import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { workspaceApi } from "@/features/workspaces/services/api";
import type { ProductCategory } from "@/models/auth/organization";
import type { ProductPlan } from "@/features/workspaces/types";
import { Select } from "@/shared/ui/Select";
import Button from "@/shared/ui/Button";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
export default function ProductChoice({category,plan,onCategory,onPlan,disabled=false,allowedCategories=["personal","business"]}:{category:ProductCategory|null;plan:string;onCategory(value:ProductCategory):void;onPlan(value:string):void;disabled?:boolean;allowedCategories?:ProductCategory[]}) {
 const {t}=useTranslation("personal");const [plans,setPlans]=useState<ProductPlan[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setPlans([]);setError("");if(!category)return;setLoading(true);void workspaceApi.catalog(category).then(result=>{if(alive)setPlans(result.data.plans);}).catch(cause=>{if(alive)setError(apiErrorMessage(cause,t("error")));}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[category,retry,t]);
 const available=plans.filter(item=>item.available && item.tier === "free");
 return <div className="space-y-4"><fieldset disabled={disabled}><legend className="mb-2 text-xs font-semibold text-slate-700">{t("productQuestion")}</legend><div className={`grid gap-3 ${allowedCategories.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{allowedCategories.map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>{onCategory(value);onPlan("");}} className={`rounded-lg border px-3 py-4 text-left text-xs transition-colors ${category===value?"border-slate-400 bg-slate-50 text-slate-900":"border-slate-200 text-slate-600 hover:bg-slate-50"}`}><span className="block font-semibold">{t(value)}</span><span className="mt-2 block leading-5 text-slate-500">{t(`${value}Description`)}</span></button>)}</div></fieldset>
 {category&&<><Select label={t("plan")} items={available} selected={available.filter(item=>item.code===plan)} onChange={items=>onPlan(items[0]?.code||"")} getItemKey={item=>item.code} getItemLabel={item=>item.name} buttonLabel={loading?t("loading"):t("choosePlan")} singleSelect hideCheckboxes hideFilter disabled={disabled||loading}/><p className="text-[11px] leading-5 text-slate-500">{t("planHint")}</p>{error&&<div role="alert" className="text-xs text-red-700">{error} <Button type="button" size="xs" variant="outline" onClick={()=>setRetry(n=>n+1)}>{t("retry")}</Button></div>}{!loading&&!error&&!available.length&&<p role="status" className="text-xs text-amber-700">{t("noPlans")}</p>}</>}
 </div>;
}

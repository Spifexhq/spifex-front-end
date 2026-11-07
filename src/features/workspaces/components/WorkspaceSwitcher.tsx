import { api } from "@/core/api/requests";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { workspaceApi } from "@/features/workspaces/services/api";
import { useWorkspaceSelection } from "./useWorkspaceSelection";
import type { Workspace } from "@/features/workspaces/types";
import type { ProductCategory } from "@/models/auth/organization";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import FloatingDialog from "@/components/Modal/FloatingDialog";
import ProductChoice from "./ProductChoice";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
export default function WorkspaceSwitcher({compact=false,manage=false}:{compact?:boolean;manage?:boolean}) {
 const {t}=useTranslation("personal"),auth=useAuthContext(),select=useWorkspaceSelection();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[items,setItems]=useState<Workspace[]>([]),[mode,setMode]=useState<"list"|"create"|"replace">("list"),[name,setName]=useState(""),[category,setCategory]=useState<ProductCategory|null>(null),[plan,setPlan]=useState(""),[confirmed,setConfirmed]=useState(false);
 const key=useRef("");
 useEffect(()=>{if(!open)return;let active=true;setLoading(true);setError("");void workspaceApi.workspaces().then(result=>{if(active)setItems(result.data);}).catch(cause=>{if(active)setError(apiErrorMessage(cause,t("error")));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[open,t]);
 const close=()=>{if(!busy)setOpen(false);};
 const enter=(next:"create"|"replace")=>{setMode(next);setName("");setCategory(next==="replace"?(auth.organization?.organization?.product_category==="personal"?"business":"personal"):null);setPlan("");setConfirmed(false);setError("");key.current=crypto.randomUUID();};
 const current=auth.organization?.organization;
 const create=async()=>{if(!category||!plan||!name.trim()||busy||(mode==="replace"&&!confirmed))return;setBusy(true);setError("");try{const {data:profile}=await api.getPersonalSettings();const payload={name:name.trim(),product_category:category,plan_code:plan,idempotency_key:key.current,currency:current?.currency||"EUR",country:category==="personal"?profile.country||undefined:undefined,timezone:profile.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone};const result=mode==="replace"&&current?await workspaceApi.replaceWorkspace(current.id,payload):await workspaceApi.createWorkspace(payload);const target="workspace" in result.data?result.data.workspace:result.data;await select(target.id);setOpen(false);}catch(cause){setError(apiErrorMessage(cause,t("error")));}finally{setBusy(false);}};
 return <><button type="button" title={t("workspaces")} aria-label={t("workspaces")} onClick={()=>{setMode("list");setOpen(true);}} className={`flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50 ${compact?"w-9 justify-center":"w-full px-3"}`}><Building2 size={15}/>{!compact&&<span className="truncate">{manage?t("manageWorkspaces"):current?.name||t("workspaces")}</span>}</button>
 <FloatingDialog isOpen={open} title={t(mode==="list"?"workspaces":mode==="create"?"newWorkspace":"replaceWorkspace")} closeLabel={t("close")} onClose={close} busy={busy} loading={loading} width={600} height={620} onSubmit={event=>{event.preventDefault();void create();}} footer={<div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={mode==="list"?close:()=>setMode("list")}>{t(mode==="list"?"close":"back")}</Button>{mode!=="list"&&<Button type="submit" disabled={busy||!name.trim()||!category||!plan||(mode==="replace"&&!confirmed)} isLoading={busy}>{t(mode==="create"?"create":"replaceWorkspace")}</Button>}</div>}>
 {error&&<p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
 {mode==="list"?<div className="space-y-3">{items.map(item=><button key={item.id} type="button" disabled={busy||item.lifecycle==="deleted"} onClick={async()=>{setBusy(true);try{await select(item.id);setOpen(false);}catch(cause){setError(apiErrorMessage(cause,t("error")));}finally{setBusy(false);}}} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"><div><p className="text-sm font-medium text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{t(item.product_category||"business")} · {t(item.lifecycle||"active")}</p></div>{item.id===current?.id&&<span className="text-xs text-emerald-700">{t("current")}</span>}</button>)}{manage&&<div className="flex flex-wrap gap-2 pt-3"><Button type="button" variant="outline" onClick={()=>enter("create")}>{t("newWorkspace")}</Button>{auth.isOwner&&(!current?.lifecycle||current.lifecycle==="active")&&<Button type="button" variant="outline" onClick={()=>enter("replace")}>{t("replaceWorkspace")}</Button>}</div>}</div>:<div className="space-y-5"><Input kind="text" label={t("workspaceName")} value={name} maxLength={175} onChange={event=>setName(event.target.value)} required disabled={busy}/><ProductChoice allowedCategories={mode==="replace"?[current?.product_category==="personal"?"business":"personal"]:undefined} category={category} plan={plan} onCategory={setCategory} onPlan={setPlan} disabled={busy}/>{mode==="replace"&&<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><p>{t("replaceWarning")}</p><label className="mt-3 flex items-start gap-2"><Checkbox checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} disabled={busy}/>{t("replaceConfirm")}</label></div>}</div>}
 </FloatingDialog></>;
}

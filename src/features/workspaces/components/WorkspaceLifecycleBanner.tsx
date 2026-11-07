import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { request } from "@/core/api/http";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import Button from "@/shared/ui/Button";
export default function WorkspaceLifecycleBanner(){
 const {t}=useTranslation("personal"),{organization,isOwner}=useAuthContext();const workspace=organization?.organization;const [busy,setBusy]=useState(false),[error,setError]=useState("");
 if(!workspace?.lifecycle||workspace.lifecycle==="active")return null;
 const exportData=async()=>{if(busy)return;setBusy(true);setError("");try{const response=await request<unknown>(`organizations/workspaces/${workspace.id}/export/`,"GET");const url=URL.createObjectURL(new Blob([JSON.stringify(response.data,null,2)],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download=`spifex-${workspace.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(cause){setError(apiErrorMessage(cause,t("error")));}finally{setBusy(false);}};
 return <section className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-6 text-amber-900" role="status"><div className="flex flex-wrap items-center justify-between gap-3"><p><strong>{t("legacyNotice")}</strong> {workspace.scheduled_deletion_at&&t("deletionScheduled",{date:new Date(workspace.scheduled_deletion_at).toLocaleDateString()})}</p>{isOwner&&<Button type="button" size="xs" variant="outline" disabled={busy} onClick={()=>void exportData()}>{t("export")}</Button>}</div>{error&&<p role="alert">{error}</p>}</section>;
}

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Paperclip, Trash2 } from "lucide-react";
import { personalApi } from "@/products/personal/services/api";
import type { EntryAttachment } from "@/products/personal/types";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import Button from "@/shared/ui/Button";

export default function TransactionAttachments({ entryId, editable = false }: { entryId: string; editable?: boolean }) {
  const { t } = useTranslation("personal");
  const [items, setItems] = useState<EntryAttachment[]>([]);
  const [limits, setLimits] = useState({ max_files: 10, max_bytes: 10 * 1024 * 1024 });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [removal, setRemoval] = useState<EntryAttachment | null>(null);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false), mounted = useRef(true), downloadAbort = useRef<AbortController | null>(null);
  window.useGlobalEsc(!!removal && !busy, () => setRemoval(null));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; downloadAbort.current?.abort(); }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void personalApi.attachments(entryId).then(({data}) => { if(active){setItems(data.results);setLimits({max_files:data.max_files,max_bytes:data.max_bytes});} })
      .catch(cause => { if(active)setError(apiErrorMessage(cause,t("error"))); })
      .finally(() => { if(active)setLoading(false); });
    return () => { active = false; };
  }, [entryId, retry, t]);
  const mutate = async (action: () => Promise<void>) => {
    if(lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await action(); }
    catch(cause){if(mounted.current)setError(apiErrorMessage(cause,t("error")));}
    finally {lock.current=false;if(mounted.current){setBusy(false);}}
  };
  const upload = (file: File) => {
    if(!editable || loading) return;
    if(file.size>limits.max_bytes){setError(t("fileTooLarge",{size:Math.floor(limits.max_bytes/1024/1024)}));return;}
    void mutate(async () => { const {data}=await personalApi.uploadAttachment(entryId,file); if(mounted.current)setItems(previous=>previous.some(item=>item.id===data.id)?previous:[...previous,data]); });
  };
  const download = async (item: EntryAttachment) => {
    if(lock.current) return;
    lock.current=true;setBusy(true);setError("");
    const controller = new AbortController(); downloadAbort.current=controller;
    try {
      const blob=await personalApi.downloadAttachment(entryId,item.id,controller.signal);
      if(!mounted.current)return;
      const url=URL.createObjectURL(blob), link=document.createElement("a");link.href=url;link.download=item.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(cause){if(mounted.current&&!controller.signal.aborted)setError(apiErrorMessage(cause,t("error")));}
    finally {lock.current=false;if(mounted.current)setBusy(false);}
  };
  return <section className="mt-6 border-t border-slate-100 pt-5">
    <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-xs font-semibold text-slate-800"><Paperclip size={15} aria-hidden="true" />{t("attachments")}</h3>{editable&&<label className={`cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 ${busy||loading||items.length>=limits.max_files?"pointer-events-none opacity-50":""}`}>{t("addFile")}<input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy||loading||items.length>=limits.max_files} onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value="";if(file)upload(file);}}/></label>}</div>
    {editable&&<p className="mt-2 text-[11px] leading-5 text-slate-500">{t("attachmentHint",{count:limits.max_files,size:Math.floor(limits.max_bytes/1024/1024)})}</p>}
    {loading?<div role="status" aria-label={t("loading")} className="mt-4 space-y-3 motion-safe:animate-pulse"><div className="h-9 rounded bg-slate-100"/><div className="h-9 rounded bg-slate-100"/></div>:<ul className="mt-3 divide-y divide-slate-100">{items.map(item=><li key={item.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-700" title={item.name}>{item.name}</p><p className="mt-1 text-[10px] text-slate-400">{Math.max(1,Math.round(item.size/1024))} KB</p></div><button type="button" disabled={busy} className="grid size-10 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-40" aria-label={t("downloadFile",{name:item.name})} onClick={()=>void download(item)}><Download size={15} aria-hidden="true" /></button>{editable&&<button type="button" disabled={busy} className="grid size-10 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label={t("removeFile",{name:item.name})} onClick={()=>setRemoval(item)}><Trash2 size={15} aria-hidden="true" /></button>}</li>)}</ul>}
    {!loading&&!items.length&&!error&&<p className="mt-4 text-xs text-slate-400">{t("noAttachments")}</p>}
    {removal&&<div role="alert" className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-600">{t("removeFileConfirm",{name:removal.name})}</p><div className="mt-3 flex justify-end gap-2"><Button size="xs" variant="outline" type="button" disabled={busy} onClick={()=>setRemoval(null)}>{t("cancel")}</Button><Button size="xs" variant="danger" type="button" disabled={busy} onClick={()=>void mutate(async()=>{await personalApi.removeAttachment(entryId,removal.id);if(mounted.current){setItems(previous=>previous.filter(item=>item.id!==removal.id));setRemoval(null);}})}>{t("remove")}</Button></div></div>}
    {error&&<div role="alert" className="mt-3 text-xs leading-5 text-red-700">{error} {!items.length&&<Button type="button" size="xs" variant="outline" onClick={()=>setRetry(value=>value+1)}>{t("retry")}</Button>}</div>}
  </section>;
}

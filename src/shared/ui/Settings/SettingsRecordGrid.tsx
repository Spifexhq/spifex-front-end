import Button from "@/shared/ui/Button";
import { SidePanelFrame, SidePanelHeader } from "@/components/Modal/SidePanel";
import Checkbox from "@/shared/ui/Checkbox";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pencil } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { RecordActionsContext } from "./RecordActionsContext";

type RecordItem = { id: string; name: string; values: string[]; labels: string[]; onEdit?: () => void };
export default function SettingsRecordGrid({ records, selectable = true }: { records: RecordItem[]; selectable?: boolean }) {
 const { t } = useTranslation("common"); const auth=useAuthContext(); const actions=useContext(RecordActionsContext);
 const reduceMotion = useReducedMotion();
 const canDelete=!!actions.deleteRecord && (auth.isOwner || auth.isSuperUser || auth.permissions.includes(actions.permission ?? ""));
 const [preview,setPreview]=useState<RecordItem|null>(null), [menu,setMenu]=useState<string|null>(null), [pending,setPending]=useState(false), [confirm,setConfirm]=useState(false), [error,setError]=useState(false);
 const { selectedIds: selected, setSelectedIds: setSelected, handleSelectRow, handleSelectAll, clearSelection } = useShiftSelect(records, record => record.id);
 const [widths,setWidths]=useState([35,32,33]); const grid=useRef<HTMLDivElement>(null); const menuRoot=useRef<HTMLDivElement>(null), drawer=useRef<HTMLDivElement>(null);
 records = records.map(record => ({ ...record, onEdit: auth.isOwner || auth.isSuperUser || auth.permissions.includes((actions.permission ?? "").replace("delete_", "change_")) ? record.onEdit : undefined, labels: record.labels.map(label => t(`records.fields.${label.replace(/ /g, '_')}`, { defaultValue: label })) }));
 const signature=records.map(r=>r.id).join('|');
 useEffect(()=>{setSelected(ids=>ids.filter(id=>signature.split("|").includes(id)));setConfirm(false);setMenu(null);},[signature,setSelected]);
 useEffect(() => {
   if (!menu) return;
   const outside = (event: PointerEvent) => { if (!menuRoot.current?.contains(event.target as Node)) setMenu(null); };
   document.addEventListener("pointerdown", outside);
   return () => document.removeEventListener("pointerdown", outside);
 }, [menu]);
 // Bubble after overlay handlers: Escape dismisses the open layer first.
 useEffect(() => {
   if (!selected.length || menu || preview) return;
   const cancelSelection = (event: KeyboardEvent) => {
     if (event.key !== "Escape" || event.defaultPrevented || document.querySelector('[role="dialog"]')) return;
     clearSelection();
     setConfirm(false);
     event.preventDefault();
   };
   window.addEventListener("keydown", cancelSelection);
   return () => window.removeEventListener("keydown", cancelSelection);
 }, [selected.length, menu, preview, clearSelection]);
 window.useGlobalEsc(!!menu, () => setMenu(null));
 window.useGlobalEsc(!!preview,()=>setPreview(null));
 const remove=async(ids:string[])=>{setPending(true);setError(false);const results=await Promise.allSettled(ids.map(id=>actions.deleteRecord!(id)));const succeeded=ids.filter((_,i)=>results[i].status==='fulfilled'), failed=ids.filter((_,i)=>results[i].status==='rejected');await actions.onDeleted?.(succeeded);setSelected(failed);setError(failed.length>0);setPending(false);setConfirm(false);setMenu(null);};
 const resize=(index:number,start:number,clientX:number)=>{const initial=[...widths], total=grid.current?.getBoundingClientRect().width||800;const move=(e:PointerEvent)=>{const delta=Math.max(12-initial[index],Math.min(initial[index+1]-12,(e.clientX-clientX)/total*100));const next=[...initial];next[index]=initial[index]+delta;next[index+1]=initial[index+1]-delta;setWidths(next);};const end=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);};void start;window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true});};
 const template=`${selectable?'36px ':''}minmax(0,${widths[0]}fr) minmax(0,${widths[1]}fr) minmax(0,${widths[2]}fr) 92px`;
 return <><div ref={grid} className="settings-record-grid" role="table" aria-label={t('records.list')}>
 <div role="row" className="record-grid-line record-grid-header" style={{gridTemplateColumns:template}}>{selectable&&<span role="columnheader"><Checkbox size="small" indeterminate={selected.length>0&&selected.length<records.length} aria-label={t('records.selectAll')} checked={records.length>0&&selected.length===records.length} disabled={!canDelete||pending} onChange={handleSelectAll} /></span>}{[t('records.name'),...(records[0]?.labels??[t('records.details'),t('records.details')])].slice(0,3).map((label,i)=><div role="columnheader" key={i} className="record-grid-cell">{label}{i<2&&<button className="column-resize" aria-label={t('records.resize',{name:label})} onPointerDown={e=>{e.preventDefault();resize(i,0,e.clientX);}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const delta=e.key==='ArrowRight'?1:-1;setWidths(w=>{if(w[i]+delta<12||w[i+1]-delta<12)return w;const n=[...w];n[i]+=delta;n[i+1]-=delta;return n;});}}} />}</div>)}<span role="columnheader" aria-label={t('records.actions')} /></div>
 {records.map(record=><div role="row" key={record.id} className="record-grid-line" style={{gridTemplateColumns:template}}>{selectable&&<span role="cell"><Checkbox size="small" aria-label={t('records.select',{name:record.name})} disabled={!canDelete||pending} checked={selected.includes(record.id)} onClick={event=>handleSelectRow(record.id,event)} /></span>}<div role="cell" className="record-grid-cell"><button className="record-name" onClick={()=>setPreview(record)}>{record.name}</button></div>{record.values.slice(0,2).map((v,i)=><div role="cell" key={i} className="record-grid-cell">{record.labels[i] === t('records.fields.account_type') ? t(`bankSettings:accountType.${v}`, { defaultValue: v }) : v||'—'}</div>)}<div role="cell" className="record-grid-actions">{record.onEdit&&<button aria-label={t('records.edit')} onClick={record.onEdit}><Pencil size={14}/></button>}{canDelete&&<div ref={menu===record.id?menuRoot:undefined} className="relative"><button aria-label={t('records.actions')} aria-expanded={menu===record.id} onClick={()=>{setMenu(menu===record.id?null:record.id);setConfirm(false);}}><MoreHorizontal size={16}/></button><AnimatePresence>{menu===record.id&&<motion.div key={record.id} initial={{opacity:0,y:-4,scale:.985}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-4,scale:.985,pointerEvents:"none"}} transition={{duration:reduceMotion?0:.15,ease:"easeOut"}} style={{transformOrigin:"top right"}} className="record-action-menu"><button disabled={pending} onClick={()=>{if(confirm)void remove([record.id]);else setConfirm(true);}}>{t(confirm?'records.confirmDelete':'records.delete')}</button></motion.div>}</AnimatePresence></div>}</div></div>)}
 </div>{error&&<p role="alert" className="p-3 text-xs text-red-600">{t('records.deleteError')}</p>}
 {selected.length>0&&<div className="record-selection-bar"><span>{t('records.selected',{count:selected.length})}</span><button disabled={pending} onClick={()=>{if(confirm)void remove(selected);else setConfirm(true);}}>{t(confirm?'records.confirmDelete':'records.delete')}</button><button disabled={pending} onClick={()=>{clearSelection();setConfirm(false);}}>{t('records.cancel')}</button></div>}
 <SidePanelFrame isOpen={!!preview} labelledBy="settings-record-preview-title" dialogRef={drawer} onBackdropClose={()=>setPreview(null)}>{preview&&<><SidePanelHeader titleId="settings-record-preview-title" title={preview.name} onClose={()=>setPreview(null)} /><div className="settings-modal-scroll"><dl className="space-y-5">{[t('records.name'),...preview.labels].map((label,i)=><div key={i}><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 text-sm break-words">{[preview.name,...preview.values][i]||'—'}</dd></div>)}</dl></div><footer className="settings-modal-footer">{preview.onEdit&&<Button type="button" variant="outline" onClick={()=>{setPreview(null);preview.onEdit?.();}}>{t('records.edit')}</Button>}</footer></>}</SidePanelFrame></>;
}
export type { RecordItem };

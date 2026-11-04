import CompactActionMenu from "@/shared/ui/Popover/CompactActionMenu";
import { ListContext } from "./SettingsListContext";
import Button from "@/shared/ui/Button";
import { SidePanelFrame, SidePanelHeader } from "@/components/Modal/SidePanel";
import Checkbox from "@/shared/ui/Checkbox";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { useContext, useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pencil } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { RecordActionsContext } from "./RecordActionsContext";

type RecordItem = { id: string; name: string; values: ReactNode[]; labels: string[]; onEdit?: () => void; onDelete?: () => void };
export default function SettingsRecordGrid({ records, selectable = true, paginate = false }: { records: RecordItem[]; selectable?: boolean; paginate?: boolean }) {
 const { t } = useTranslation("common"); const auth=useAuthContext(); const actions=useContext(RecordActionsContext);
 const { index: page, size, server, setCount } = useContext(ListContext);
 useEffect(() => { if (paginate && !server) setCount(records.length); }, [paginate, server, records.length, setCount]);
 if (paginate && !server) records = records.slice(page * size, (page + 1) * size);
 const canDelete=!!actions.deleteRecord && (auth.isOwner || auth.isSuperUser || auth.permissions.includes(actions.permission ?? ""));
 const [preview,setPreview]=useState<RecordItem|null>(null), [menu,setMenu]=useState<string|null>(null), [pending,setPending]=useState(false), [confirm,setConfirm]=useState(false), [error,setError]=useState(false);
 const { selectedIds: selected, setSelectedIds: setSelected, handleSelectRow, handleSelectAll, clearSelection } = useShiftSelect(records, record => record.id);
 const columns = 1 + (records[0]?.labels.length ?? 2);
 const [widths,setWidths]=useState(() => [35, ...Array.from({length:columns-1},()=>65/(columns-1))]); const grid=useRef<HTMLDivElement>(null); const menuAnchor=useRef<HTMLButtonElement | null>(null), drawer=useRef<HTMLDivElement>(null);
 records = records.map(record => ({ ...record, onEdit: !actions.permission || auth.isOwner || auth.isSuperUser || auth.permissions.includes((actions.permission ?? "").replace("delete_", "change_")) ? record.onEdit : undefined, labels: record.labels.map(label => t(`records.fields.${label.replace(/ /g, '_')}`, { defaultValue: label })) }));
 const signature=records.map(r=>r.id).join('|');
 useEffect(()=>{setSelected(ids=>ids.filter(id=>signature.split("|").includes(id)));setConfirm(false);setMenu(null);},[signature,setSelected]);
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
 window.useGlobalEsc(!!preview,()=>setPreview(null));
 const remove=async(ids:string[])=>{setPending(true);setError(false);const results=await Promise.allSettled(ids.map(id=>actions.deleteRecord!(id)));const succeeded=ids.filter((_,i)=>results[i].status==='fulfilled'), failed=ids.filter((_,i)=>results[i].status==='rejected');await actions.onDeleted?.(succeeded);setSelected(failed);setError(failed.length>0);setPending(false);setConfirm(false);setMenu(null);};
 const resize=(index:number,start:number,clientX:number)=>{const initial=[...widths], total=grid.current?.getBoundingClientRect().width||800;const move=(e:PointerEvent)=>{const delta=Math.max(6-initial[index],Math.min(initial[index+1]-6,(e.clientX-clientX)/total*100));const next=[...initial];next[index]=initial[index]+delta;next[index+1]=initial[index+1]-delta;setWidths(next);};const end=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);};void start;window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true});};
 const template=`${selectable?'36px ':''}${widths.map(width=>`minmax(0,${width}fr)`).join(' ')} 64px`;
 const rowStyle = { '--record-columns': template, '--mobile-columns': `${selectable?'32px ':''}minmax(0,1fr) 64px` } as CSSProperties;
 const rowClass = 'grid min-h-10 md:min-w-[740px] items-center border-b border-gray-100 px-3 [grid-template-columns:var(--record-columns)] max-md:px-2 max-md:[grid-template-columns:var(--mobile-columns)]';
 const cellClass = 'relative min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 text-xs text-gray-500 max-md:px-1';
 return <><CompactActionMenu open={!!menu} anchor={menuAnchor} onClose={()=>setMenu(null)}><button type="button" disabled={pending} onClick={()=>{const record=records.find(row=>row.id===menu);if(record?.onDelete){setMenu(null);record.onDelete();}else if(confirm&&menu)void remove([menu]);else setConfirm(true);}}>{t(confirm?'records.confirmDelete':'records.delete')}</button></CompactActionMenu>
 <div ref={grid} className="max-h-[65dvh] w-full overflow-auto" role="table" aria-label={t('records.list')}>
 <div role="row" className={`${rowClass} sticky top-0 z-10 border-gray-200 bg-gray-50 text-xs font-medium text-gray-500`} style={rowStyle}>{selectable&&<span role="columnheader"><Checkbox size="small" indeterminate={selected.length>0&&selected.length<records.length} aria-label={t('records.selectAll')} checked={records.length>0&&selected.length===records.length} disabled={!canDelete||pending} onChange={handleSelectAll}/></span>}{[t('records.name'),...(records[0]?.labels??[t('records.details'),t('records.details')])].map((label,i)=><div role="columnheader" key={i} className={`relative min-w-0 truncate px-3 py-2.5 font-medium ${i?'hidden md:block':''}`}>{label}{i<columns-1&&<button type="button" role="separator" aria-orientation="vertical" className="absolute inset-y-2 right-0 hidden w-2 cursor-col-resize touch-none border-r border-gray-200/70 hover:border-gray-400 focus-visible:border-gray-500 focus-visible:outline-none md:block" aria-label={t('records.resize',{name:label})} onPointerDown={e=>{e.preventDefault();resize(i,0,e.clientX);}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const delta=e.key==='ArrowRight'?1:-1;setWidths(w=>{if(w[i]+delta<6||w[i+1]-delta<6)return w;const n=[...w];n[i]+=delta;n[i+1]-=delta;return n;});}}}/>}</div>)}<span role="columnheader" aria-label={t('records.actions')}/></div>
 {records.map(record=><div role="row" key={record.id} className={`${rowClass} transition-colors last:border-b-0 hover:bg-gray-50`} style={rowStyle}>{selectable&&<span role="cell"><Checkbox size="small" aria-label={t('records.select',{name:record.name})} disabled={!canDelete||pending} checked={selected.includes(record.id)} onClick={event=>handleSelectRow(record.id,event)}/></span>}<div role="cell" className="min-w-0 px-3 text-[13px] text-gray-900 max-md:px-1"><button type="button" className="block max-w-full truncate py-2 text-left font-medium hover:underline focus-visible:outline-2 focus-visible:outline-gray-400" onClick={()=>setPreview(record)} title={record.name}>{record.name}</button></div>{record.values.map((v,i)=><div role="cell" key={i} className={`${cellClass} hidden md:block`}>{record.labels[i]===t('records.fields.account_type')&&typeof v==='string'?t(`bankSettings:accountType.${v}`,{defaultValue:v}):v??'—'}</div>)}<div role="cell" className="flex items-center justify-end gap-1">{record.onEdit&&<button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label={t('records.edit')} onClick={record.onEdit}><Pencil size={13}/></button>}{(canDelete||record.onDelete)&&<button type="button" ref={menu===record.id?menuAnchor:undefined} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label={t('records.actions')} aria-expanded={menu===record.id} onClick={event=>{menuAnchor.current=event.currentTarget;setMenu(menu===record.id?null:record.id);setConfirm(false);}}><MoreHorizontal size={14}/></button>}</div></div>)}
 </div>{error&&<p role="alert" className="p-3 text-xs text-red-600">{t('records.deleteError')}</p>}
 {selected.length>0&&<div className="record-selection-bar [position:fixed] [bottom:24px] [left:50%] [transform:translateX(-50%)] [z-index:11000] [display:flex] [align-items:center] [gap:16px] [max-width:calc(100vw_-_24px)] [padding:12px_16px] [border:1px_solid_#dce1e8] [border-radius:10px] [background:white] [box-shadow:0_8px_32px_#26334d30] [font-size:12px] max-md:[gap:10px] max-md:[width:max-content]"><span>{t('records.selected',{count:selected.length})}</span><button disabled={pending} onClick={()=>{if(confirm)void remove(selected);else setConfirm(true);}}>{t(confirm?'records.confirmDelete':'records.delete')}</button><button disabled={pending} onClick={()=>{clearSelection();setConfirm(false);}}>{t('records.cancel')}</button></div>}
 <SidePanelFrame isOpen={!!preview} labelledBy="settings-record-preview-title" dialogRef={drawer} onBackdropClose={()=>setPreview(null)}>{preview&&<><SidePanelHeader titleId="settings-record-preview-title" title={preview.name} onClose={()=>setPreview(null)} /><div className="settings-modal-scroll"><dl className="space-y-5">{[t('records.name'),...preview.labels].map((label,i)=><div key={i}><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 text-sm break-words">{[preview.name,...preview.values][i]||'—'}</dd></div>)}</dl></div><footer className="settings-modal-footer">{preview.onEdit&&<Button type="button" variant="outline" onClick={()=>{setPreview(null);preview.onEdit?.();}}>{t('records.edit')}</Button>}</footer></>}</SidePanelFrame></>;
}
export type { RecordItem };

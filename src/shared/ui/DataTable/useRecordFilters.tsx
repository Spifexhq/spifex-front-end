import { useEffect } from "react";
import { useCursorPager, type FetchPage } from "@/hooks/useCursorPager";
import { matchesRecordFilters } from "./recordFiltering";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
type Control<T> = { key: string; label: string; value(item: T): string; format?(value: string): string; date?: "from" | "to" };
export function useRecordFilters<T>(items: T[], controls: Control<T>[], searchValue: (item: T) => string, remote?: { key: string; enabled?: boolean; fetchPage(filters:Record<string,string>,cursor?:string,pageSize?:number):ReturnType<FetchPage<T,{options:Record<string,string[]>;optionLabels:Record<string,Record<string,string>>}>>; placeholder: string; onItems(items: T[]): void }) {
 const { t } = useTranslation("common");
 const id = useId();
 const [draft, setDraft] = useState<Record<string,string>>({});
 const [applied, setApplied] = useState<Record<string,string>>({});
 const [open, setOpen] = useState(false);
 const engine = useCursorPager<T,{options:Record<string,string[]>;optionLabels:Record<string,Record<string,string>>}>((cursor,size)=>remote?remote.fetchPage(applied,cursor,size):Promise.resolve({items:[]}),{autoLoadFirst:!!remote && remote.enabled!==false,deps:[remote?.key,applied]});
 const pager={...engine,options:engine.metadata?.options||{},optionLabels:engine.metadata?.optionLabels||{}};
 const onItems = remote?.onItems;
 useEffect(() => { onItems?.(pager.items); }, [pager.items, onItems]);
 const rows = remote ? pager.items : items.filter(item => matchesRecordFilters(item, applied, controls, searchValue));
 const filters = <form className="space-y-3" onSubmit={event=>{event.preventDefault();setApplied({...draft});}}><div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Input kind="text" label={t("tableFilters.search")} placeholder={remote?.placeholder || t("tableFilters.placeholder")} value={draft.search||""} onChange={event=>setDraft(previous=>({...previous,search:event.target.value}))}/></div><Button type="submit" variant="outline">{t("tableFilters.search")}</Button><Button type="button" variant="outline" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(previous=>!previous)}><SlidersHorizontal size={14}/><span className="hidden sm:inline">{t("tableFilters.filters")}</span></Button></div>{open&&<div id={id} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{controls.map(control=>{const options=(remote ? pager.options[control.key] || [] : [...new Set(items.map(control.value).filter(Boolean))].sort()).map(value=>({value,label:(remote ? pager.optionLabels[control.key]?.[value] : undefined)||control.format?.(value)||value}));return control.date?<Input key={control.key} kind="date" label={control.label} value={draft[control.key]||""} onValueChange={value=>setDraft(previous=>({...previous,[control.key]:value}))}/>:<Select key={control.key} label={control.label} items={options} selected={options.filter(option=>option.value===draft[control.key])} onChange={selected=>setDraft(previous=>({...previous,[control.key]:selected[0]?.value||""}))} getItemKey={item=>item.value} getItemLabel={item=>item.label} singleSelect hideCheckboxes/>;})}</div><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="cancel" onClick={()=>{setDraft({});setApplied({});}}>{t("tableFilters.clear")}</Button><Button type="submit">{t("tableFilters.apply")}</Button></div></div>}</form>;
 return {rows,filters,pager,key:JSON.stringify(applied)};
}

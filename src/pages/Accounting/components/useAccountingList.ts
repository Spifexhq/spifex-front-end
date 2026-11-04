import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { getCursorFromUrl } from "@/lib/list";
import { accountingErrorMessage } from "../accountingError";
export function useAccountingList<T>(resource: string | undefined, filters: Record<string,string>) {
 const { organization } = useAuthContext();
 const [items,setItems]=useState<T[]>([]),[pageSize,setPageSize]=useState(20),[index,setIndex]=useState(0),[totalCount,setTotal]=useState<number>(),[loading,setLoading]=useState(!!resource),[error,setError]=useState<string|null>(null),[options,setOptions]=useState<Record<string,string[]>>({}),[canNext,setCanNext]=useState(false);
 const [optionLabels,setLabels]=useState<Record<string,Record<string,string>>>({});
 const generation=useRef(0),pending=useRef(false);
 const pages=useRef(new Map<number,{items:T[];next?:string}>());
 const signature=JSON.stringify({resource,filters,size:pageSize,org:organization?.organization?.id});
 const query=useRef({resource,filters,pageSize});query.current={resource,filters,pageSize};
 const fetchPage=useCallback(async (page:number, token?:string, fresh=false)=>{
  const current=query.current;if(!current.resource)return;
  const version=generation.current;pending.current=true;setLoading(true);setError(null);
  try { const response=await api.getAccountingList<T>(current.resource,{...current.filters,cursor:token,page_size:current.pageSize,include_count:"true",...(fresh?{_r:String(Date.now())}: {})});
   if(version!==generation.current)return;
   const data=response.data;if(!Array.isArray(data.results))throw new Error("Unexpected accounting list response.");
   const next=getCursorFromUrl(data.next);pages.current.set(page,{items:data.results,next});setItems(data.results);setIndex(page);setTotal(data.count);setCanNext(!!next);setOptions(data.filters||{});setLabels(data.filter_labels||{});
  }catch(cause){if(version===generation.current)setError(accountingErrorMessage(cause,"Unable to load accounting records."));}
  finally{if(version===generation.current){pending.current=false;setLoading(false);}}
 },[]);
 const refresh=useCallback(async()=>{generation.current++;pages.current.clear();setItems([]);setIndex(0);setCanNext(false);await fetchPage(0,undefined,true);},[fetchPage]);
 const cancel = useCallback(() => { generation.current += 1; }, []);
 useEffect(()=>{void refresh();return cancel;},[signature,refresh,cancel]);
 const goto=async(page:number)=>{if(pending.current||page<0)return;const cached=pages.current.get(page);if(cached){setItems(cached.items);setIndex(page);setCanNext(!!cached.next);return;}const token=pages.current.get(page-1)?.next;if(page===0||token)await fetchPage(page,token);};
 return {items,pageSize,setPageSize,index,totalCount,loading,error,options,optionLabels,refresh,canPrev:index>0&&!loading,canNext:canNext&&!loading,prev:()=>goto(index-1),next:()=>goto(index+1)};
}

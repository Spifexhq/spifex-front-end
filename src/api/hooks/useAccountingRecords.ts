import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
export type RecordMetadata={options:Record<string,string[]>;optionLabels:Record<string,Record<string,string>>};
/** Backend adapter only; caching, paging and cancellation belong to useCursorPager. */
export function useAccountingSource<T>(resource:string|undefined){
 const {organization}=useAuthContext();
 return{key:JSON.stringify([resource,organization?.organization?.id]),enabled:!!resource,fetchPage:async(filters:Record<string,string>,cursor?:string,pageSize=20)=>{
  if(!resource)return{items:[] as T[]};
  try{const {data}=await api.getAccountingList<T>(resource,{...filters,cursor,page_size:pageSize,include_count:"true",_r:String(Date.now())});
   if(!Array.isArray(data.results))throw new Error("Unexpected record list response.");
   return{items:data.results,nextCursor:getCursorFromUrl(data.next),totalCount:data.count,metadata:{options:data.filters||{},optionLabels:data.filter_labels||{}}};
  }catch(cause){throw new Error(apiErrorMessage(cause,"Unable to load accounting records."));}
 }};
}
export function useAccountingRecords<T>(resource:string|undefined,filters:Record<string,string>){
 const source=useAccountingSource<T>(resource);
 const pager=useCursorPager<T,RecordMetadata>((cursor,size)=>source.fetchPage(filters,cursor,size),{autoLoadFirst:source.enabled,deps:[source.key,filters]});
 return{...pager,options:pager.metadata?.options||{},optionLabels:pager.metadata?.optionLabels||{}};
}

import { personalApi } from "@/products/personal/services/api";
import type { PersonalCollection, PersonalRecord } from "@/products/personal/types";
export async function allPersonal<T extends PersonalRecord>(collection:PersonalCollection):Promise<T[]> {
 const items:T[]=[];let cursor:string|undefined;const seen=new Set<string>();
 do {const {data}=await personalApi.list<T>(collection,{page_size:100,page:cursor});items.push(...data.results);cursor=data.next?new URL(data.next,location.origin).searchParams.get("page")||undefined:undefined;if(cursor){if(seen.has(cursor))throw new Error("Repeated pagination cursor");seen.add(cursor);}}while(cursor);
 return items;
}
export const today=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;};
export const readonlyWorkspace=(lifecycle?:string)=>!!lifecycle&&lifecycle!=="active";

import { useEffect, useState } from "react";
import type { Pager } from "./types";
export function useTablePagination<T>(items:T[], pager?:Pager, enabled=true) {
 const [size,setSize]=useState(20),[index,setIndex]=useState(0);
 const page=pager?.index??index,pageSize=pager?.pageSize??size;
 useEffect(()=>{if(!pager&&index>0&&index*size>=items.length)setIndex(Math.max(0,Math.ceil(items.length/size)-1));},[items.length,index,size,pager]);
 const rows=!enabled||pager?items:items.slice(page*pageSize,(page+1)*pageSize);
 const start=rows.length?page*pageSize+1:0,end=rows.length?start+rows.length-1:0;
 return {rows,pageSize,start,end,total:pager?pager.totalCount:items.length,
 canPrev:pager?pager.canPrev:page>0,canNext:pager?pager.canNext:end<items.length,
 prev:()=>pager?pager.prev():setIndex(value=>Math.max(0,value-1)),next:()=>pager?pager.next():setIndex(value=>value+1),
 setPageSize:(value:number)=>{if(pager)pager.setPageSize(value);else{setSize(value);setIndex(0);}}};
}

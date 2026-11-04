import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
export function resizeColumns(widths:number[],index:number,delta:number) {
 if(index<0||index>=widths.length-1)return widths;
 const shift=Math.max(6-widths[index],Math.min(widths[index+1]-6,delta));
 return widths.map((value,i)=>i===index?value+shift:i===index+1?value-shift:value);
}
export function useColumnWidths(keys:string[],initialWidths?:number[]) {
 const signature=keys.join("|");
 const initial=initialWidths?.length===keys.length?initialWidths:keys.map(()=>100/keys.length);
 const [state,setState]=useState({signature,widths:initial});
 const widths=state.signature===signature?state.widths:initial;
 const stop=useRef<()=>void>(()=>{});
 useEffect(()=>()=>stop.current(),[]);
 const resize=(index:number,delta:number)=>setState(previous=>({signature,widths:resizeColumns(previous.signature===signature?previous.widths:initial,index,delta)}));
 const start=(event:ReactPointerEvent,index:number,total:number)=>{
  event.preventDefault();stop.current();let last=event.clientX;
  const move=(e:PointerEvent)=>{resize(index,(e.clientX-last)/total*100);last=e.clientX;};
  const finish=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",finish);};
  stop.current=finish;window.addEventListener("pointermove",move);window.addEventListener("pointerup",finish,{once:true});window.addEventListener("pointercancel",finish,{once:true});
 };
 return {widths,resize,start};
}

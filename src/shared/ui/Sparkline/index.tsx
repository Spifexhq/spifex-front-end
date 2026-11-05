import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Fixed geometry lets updates morph smoothly, even when the reporting bucket count changes. */
function paths(values: number[]) {
  const low = Math.min(...values), high = Math.max(...values), range = high-low;
  const points = Array.from({length:32},(_,index)=>{
    const position = index/31*(values.length-1), left = Math.floor(position), fraction = position-left;
    const value = values[left]+((values[Math.min(left+1,values.length-1)]-values[left])*fraction);
    return [4+index/31*88,range ? 33-(value-low)/range*27 : 19];
  });
  const line = points.map(([x,y],index)=>`${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return {line,area:`${line} L92,39 L4,39 Z`,last:points[points.length-1]};
}

/** A noninteractive preview interpolated from actual observations, with reduced-motion support. */
export default function Sparkline({ values, color = "#6366f1", className = "", label }: { values: number[]; color?: string; className?: string; label: string }) {
  const reduced = useReducedMotion(), id = useId().replace(/:/g, "");
  const points = values.filter(Number.isFinite);
  if (!points.length) return null;
  const geometry = paths(points);
  const transition = {duration:reduced ? 0 : .45,ease:"easeOut" as const};
  return <svg role="img" aria-label={label} viewBox="0 0 96 40" className={`h-10 w-24 shrink-0 overflow-visible ${className}`}>
    <title>{label}</title>
    <defs><linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.12}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
    <motion.path d={geometry.area} fill={`url(#spark-${id})`} stroke="none" initial={reduced ? false : {opacity:0}} animate={{d:geometry.area,opacity:1}} transition={transition}/>
    <motion.path d={geometry.line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" initial={reduced ? false : {pathLength:0,opacity:0}} animate={{d:geometry.line,pathLength:1,opacity:1}} transition={transition}/>
    <motion.circle cx={geometry.last[0]} cy={geometry.last[1]} r={2.4} fill={color} initial={reduced ? false : {opacity:0}} animate={{cx:geometry.last[0],cy:geometry.last[1],opacity:1}} transition={transition}/>
  </svg>;
}

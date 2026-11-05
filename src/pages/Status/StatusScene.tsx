import { motion } from "framer-motion";
import { Search, Wrench, Sparkles, Unplug } from "lucide-react";

export type StatusKind = "notFound" | "error" | "maintenance" | "comingSoon";

/** Decorative receipt companion; motion can be paused independently of navigation. */
export default function StatusScene({ kind, paused }: { kind: StatusKind; paused: boolean }) {
  const Icon = { notFound: Search, error: Unplug, maintenance: Wrench, comingSoon: Sparkles }[kind];
  const loop = { duration: 4, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <div aria-hidden="true" className="relative mx-auto flex h-64 w-full max-w-xs items-center justify-center sm:h-72">
      <div className="absolute h-56 w-56 rounded-full bg-[radial-gradient(circle,#eed4bf_0%,#f8eee5_55%,transparent_72%)]" />
      <div className="absolute bottom-9 h-3 w-28 rounded-[100%] bg-[#754b32]/10 blur-sm" />
      <motion.div animate={paused ? { y: 0, rotate: -3 } : { y: [0, -8, 0], rotate: [-3, 3, -3] }} transition={paused ? { duration: 0 } : loop} className="relative h-36 w-28 rounded-xl border border-[#d9bba3] bg-[#fffdf9] p-5 shadow-[0_8px_24px_#754b3210]">
        <div className="flex items-center justify-between"><span className="h-1.5 w-7 rounded-full bg-[#dfc8b5]" /><span className="h-2 w-2 rounded-full bg-[var(--accentPrimary)]" /></div>
        <motion.div animate={paused ? { x: 0 } : { x: kind === "notFound" ? [-3, 3, -3] : [0, 0, 0] }} transition={loop} className="mt-6 flex justify-center gap-5">
          {[0, 1].map(eye => <motion.span key={eye} animate={paused ? { scaleY: 1 } : { scaleY: [1, 1, .15, 1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, .65, .69, .73, 1] }} className="h-2.5 w-1.5 rounded-full bg-[#29221e]" />)}
        </motion.div>
        <div className={`mx-auto mt-3 h-2 w-4 ${kind === "error" ? "rounded-t-full border-t" : "rounded-b-full border-b"} border-[#754b32]`} />
        <div className="mt-5 flex justify-center gap-1.5">{[0, 1, 2].map(i => <span key={i} className="h-1 w-4 rounded-full bg-[#ead8c9]" />)}</div>
        <div className="absolute -bottom-1.5 left-3 right-3 flex justify-between">{[0, 1, 2, 3, 4].map(i => <span key={i} className="h-3 w-3 rotate-45 border-b border-r border-[#d9bba3] bg-[#fffdf9]" />)}</div>
      </motion.div>
      <motion.div animate={paused ? { x: 0, y: 0, rotate: 10 } : { x: [0, 6, 0], y: [0, -6, 0], rotate: kind === "maintenance" ? [10, -18, 10] : [10, 18, 10] }} transition={paused ? { duration: 0 } : { ...loop, delay: .15 }} className="absolute bottom-14 right-12 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d8b49a] bg-[#efd9c8] text-[#8c4b2d] shadow-sm">
        <Icon size={25} strokeWidth={1.5} />
      </motion.div>
      {[0, 1, 2].map(i => <motion.span key={i} animate={paused ? { y: 0, opacity: .6 } : { y: [0, -7, 0], opacity: [.35, .8, .35] }} transition={paused ? { duration: 0 } : { ...loop, delay: i * .5 }} style={{ left: `${18 + i * 29}%`, top: `${21 + (i % 2) * 49}%` }} className="absolute h-1.5 w-1.5 rounded-full bg-[#bc8969]" />)}
    </div>
  );
}

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ResultsPerPage({ value, onChange, disabled, children }: { value: number; onChange(value: number): void; disabled?: boolean; children: ReactNode }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 200, maxHeight: 224, above: true });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const reduced = useReducedMotion();
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      // The portal must follow the trigger, including nested scrolling containers.
      let visibleTop = 0, visibleBottom = window.innerHeight;
      let visibleLeft = 0, visibleRight = window.innerWidth;
      for (let ancestor = trigger.current?.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
          visibleTop = Math.max(visibleTop, bounds.top);
          visibleBottom = Math.min(visibleBottom, bounds.bottom);
        }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
          visibleLeft = Math.max(visibleLeft, bounds.left);
          visibleRight = Math.min(visibleRight, bounds.right);
        }
      }
      if (rect.bottom <= visibleTop || rect.top >= visibleBottom || rect.right <= visibleLeft || rect.left >= visibleRight) {
        setOpen(false);
        return;
      }
      const gap = 8, width = Math.min(200, window.innerWidth - gap * 2);
      const aboveSpace = Math.max(0, rect.top - gap * 2);
      const belowSpace = Math.max(0, window.innerHeight - rect.bottom - gap * 2);
      const height = panel.current?.scrollHeight || 200;
      const above = aboveSpace >= Math.min(height, 224) || aboveSpace >= belowSpace;
      const maxHeight = Math.min(224, above ? aboveSpace : belowSpace);
      const top = above ? rect.top - gap - Math.min(height, maxHeight) : rect.bottom + gap;
      const next = { left: Math.max(gap, Math.min(rect.right - width, window.innerWidth - width - gap)), top: Math.max(gap, Math.min(top, window.innerHeight - maxHeight - gap)), width, maxHeight, above };
      setPosition(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    let frame = 0;
    const follow = () => { place(); frame = requestAnimationFrame(follow); };
    follow();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape, true); };
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return <>
    <button ref={trigger} type="button" disabled={disabled} aria-expanded={open} aria-controls={open ? id : undefined} className="inline-flex min-h-8 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 max-md:min-h-10" onClick={() => setOpen(previous => !previous)}>{children}<ChevronDown size={13} aria-hidden="true" /></button>
    {createPortal(<AnimatePresence>{open && <motion.div ref={panel} id={id} role="group" aria-label={t("pagination.perPage")} initial={{ opacity: 0, y: position.above ? 4 : -4, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: position.above ? 4 : -4, scale: .985, pointerEvents: "none" }} transition={{ duration: reduced ? 0 : .15, ease: "easeOut" }} style={{ position: "fixed", zIndex: 10060, left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight, transformOrigin: position.above ? "bottom right" : "top right" }} className="overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-1.5 text-[13px] text-slate-700 shadow-lg">
      <p className="px-2.5 py-2 text-xs font-semibold">{t("pagination.perPage")}</p>
      {[20, 50, 100].map(size => <button key={size} type="button" aria-pressed={value === size} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none max-md:min-h-10" onClick={() => { onChange(size); close(); }}><span className="flex-1">{size}</span><span className="flex w-4 shrink-0 justify-center" aria-hidden="true">{value === size && <Check size={15} aria-hidden="true" />}</span></button>)}
    </motion.div>}</AnimatePresence>, document.body)}
  </>;
}

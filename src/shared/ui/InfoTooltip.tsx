import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { tooltipPosition } from "./tooltipPosition";

export default function InfoTooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 0 });
  const cancelClose = useCallback(() => { clearTimeout(closeTimer.current); }, []);
  const show = () => { cancelClose(); setOpen(true); };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(false), 120); };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;
      if (trigger.bottom < 0 || trigger.top > window.innerHeight) { setOpen(false); return; }
      setPosition(tooltipPosition(trigger, { width: tooltip.offsetWidth, height: tooltip.scrollHeight }, { width: window.innerWidth, height: window.innerHeight }));
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); cancelClose(); setOpen(false); }
    };
    const outside = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !tooltipRef.current?.contains(event.target as Node)) setOpen(false);
    };
    update();
    const observer = new ResizeObserver(update);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("keydown", dismiss, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("keydown", dismiss, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, children, cancelClose]);

  return <span className="inline-flex align-middle">
    <button ref={triggerRef} type="button" aria-label={label} aria-describedby={open ? id : undefined}
      onMouseEnter={show} onMouseLeave={scheduleClose} onFocus={show} onBlur={scheduleClose}
      onClick={event => { event.preventDefault(); event.stopPropagation(); show(); }}
      className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-gray-400"><Info size={13} aria-hidden="true" /></button>
    {open && createPortal(<div ref={tooltipRef} id={id} role="tooltip" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}
      style={{ ...position, visibility: position.maxHeight ? "visible" : "hidden" }}
      className="fixed z-[10050] w-[280px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-lg border border-gray-200 bg-gray-900 px-3 py-2.5 text-xs font-normal leading-5 tracking-normal text-white shadow-lg">{children}</div>, document.body)}
  </span>;
}

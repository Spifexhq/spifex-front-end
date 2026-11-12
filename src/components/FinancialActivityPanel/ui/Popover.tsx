import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";

/** Anchored to the trigger, portalled above scroll containers, and constrained to the viewport. */
export function Popover({ children, onClose, anchorRef, className = "w-[360px]", isMobile = false, title, ariaLabel, align = "left", role = "dialog" }: {
  children: ReactNode; onClose(): void; anchorRef: RefObject<HTMLElement>;
  className?: string; isMobile?: boolean; title?: string; ariaLabel?: string; align?: "left" | "right"; role?: "dialog" | "menu";
}) {
  const { t } = useTranslation("filterBar");
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(isMobile, panel);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 400, ready: false });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const close = useCallback(() => {
    setOpen(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(onClose, 140);
  }, [onClose]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => { cancelAnimationFrame(frame); clearTimeout(timer.current); };
  }, []);
  useLayoutEffect(() => {
    if (isMobile) return;
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const element = panel.current;
      if (!anchor || !element) return;
      const margin = 12, gap = 6;
      const below = Math.max(0, innerHeight - anchor.bottom - margin - gap);
      const above = Math.max(0, anchor.top - margin - gap);
      const height = element.scrollHeight;
      const placeBelow = below >= Math.min(height, 300) || below >= above;
      const maxHeight = Math.max(0, Math.min(480, placeBelow ? below : above));
      const top = placeBelow ? anchor.bottom + gap : Math.max(margin, anchor.top - Math.min(height, maxHeight) - gap);
      const left = Math.max(margin, Math.min(align === "right" ? anchor.right - element.offsetWidth : anchor.left, innerWidth - element.offsetWidth - margin));
      const next = { top, left, maxHeight, ready: true };
      setPosition(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    if (panel.current) observer.observe(panel.current);
    if (anchorRef.current) observer.observe(anchorRef.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [anchorRef, isMobile, align]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      // The shared Select and date pickers render their own portals above this surface.
      if (panel.current?.contains(target) || anchorRef.current?.contains(target) || target.closest('[data-select-open], [role="listbox"], [data-calendar-portal]')) return;
      close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [anchorRef, close]);
  return createPortal(<>
    {isMobile && <div aria-hidden className={`fixed inset-0 z-[10050] bg-gray-950/20 transition-opacity duration-150 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} />}
    <div ref={panel} role={role} aria-modal={isMobile && role === "dialog" || undefined} tabIndex={-1} aria-label={ariaLabel || title} data-finance-popover
      style={isMobile ? undefined : { top: position.top, left: position.left, maxHeight: position.maxHeight, visibility: position.ready ? "visible" : "hidden" }}
      className={`fixed z-[10060] max-w-[calc(100vw-24px)] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_32px_#26334d20] transition-[opacity,translate,scale] duration-150 ease-out motion-reduce:transition-none ${isMobile ? "inset-x-3 bottom-3 max-h-[80dvh] w-auto" : className} ${open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0 pointer-events-none"}`}>
      {title && <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-100 pb-2">
        <h3 className="text-xs font-semibold text-gray-800">{title}</h3>
        <button type="button" onClick={close} aria-label={t("configModal.close")} className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-gray-400"><X size={15} aria-hidden /></button>
      </div>}
      {children}
    </div>
  </>, document.body);
}

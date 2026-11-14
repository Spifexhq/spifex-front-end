import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Side = "right" | "left";

type Position = {
  left: number;
  top: number;
  side: Side;
  ready: boolean;
};

const EDGE = 12;
const GAP = 10;
const CLOSE_DELAY = 120;

/**
 * Visual label for icon-only sidebar controls. The control keeps its own
 * localized aria-label; this tooltip is a hover/focus affordance only.
 */
export default function SidebarTooltip({ label, collapsed, children, fullWidth = false, className = "" }: { label: string; collapsed: boolean; children: ReactNode; fullWidth?: boolean; className?: string }) {
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ left: 0, top: 0, side: "right", ready: false });

  const cancelClose = useCallback(() => { clearTimeout(closeTimer.current); }, []);
  const close = useCallback(() => { cancelClose(); setOpen(false); }, [cancelClose]);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }, [cancelClose]);
  const show = useCallback(() => {
    if (!collapsed) return;
    cancelClose();
    setPosition(previous => ({ ...previous, ready: false }));
    setOpen(true);
  }, [cancelClose, collapsed]);

  useEffect(() => {
    if (!collapsed) { cancelClose(); setOpen(false); }
  }, [cancelClose, collapsed]);
  useEffect(() => () => cancelClose(), [cancelClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = wrapperRef.current?.querySelector<HTMLElement>("a, button, [role='button']");
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;
      const rect = trigger.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) { setOpen(false); return; }
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      const rightLeft = rect.right + GAP;
      const side: Side = rightLeft + width <= window.innerWidth - EDGE ? "right" : "left";
      const left = side === "right" ? rightLeft : Math.max(EDGE, rect.left - GAP - width);
      const top = Math.max(EDGE, Math.min(rect.top + rect.height / 2 - height / 2, window.innerHeight - height - EDGE));
      setPosition({ left, top, side, ready: true });
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
    };
    const outside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node) && !tooltipRef.current?.contains(event.target as Node)) close();
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
  }, [close, open]);

  return <span
    ref={wrapperRef}
    className={`block max-w-full ${fullWidth ? "w-full" : "w-fit"} ${className}`}
    onMouseEnter={collapsed ? show : undefined}
    onMouseLeave={collapsed ? scheduleClose : undefined}
    onFocus={collapsed ? show : undefined}
    onBlur={collapsed ? scheduleClose : undefined}
  >
    {children}
    {open && collapsed && createPortal(
      <div
        ref={tooltipRef}
        id={id}
        role="tooltip"
        data-side={position.side}
        style={{ left: position.left, top: position.top, visibility: position.ready ? "visible" : "hidden" }}
        className="sidebar-tooltip pointer-events-none fixed z-[10050] w-max max-w-[240px] rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium leading-5 text-white shadow-lg"
      >
        {label}
        <span aria-hidden="true" className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-gray-900 ${position.side === "right" ? "-left-1" : "-right-1"}`} />
      </div>,
      document.body
    )}
  </span>;
}

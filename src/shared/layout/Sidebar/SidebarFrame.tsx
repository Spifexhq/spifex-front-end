import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
import SidebarBrand from "./SidebarBrand";
import "./sidebar-motion.css";

type Props = {
  open: boolean; mobile?: boolean; onToggle(): void;
  product: "Business" | "Personal"; label: string; toggleLabel: string;
  workspace: ReactNode; footer: ReactNode; children: ReactNode;
  /** `rail` is the sticky workspace rail; `section` is a fixed settings/accounting rail. */
  position?: "rail" | "section";
  /** Optional offset for layouts that start below a local header. */
  topOffsetPx?: number;
};

/** Product-neutral navigation rail. Product routes and permissions remain with the caller. */
export default function SidebarFrame({ open, mobile = false, onToggle, product, label, toggleLabel, workspace, footer, children, position = "rail", topOffsetPx = 0 }: Props) {
  const ref = useRef<HTMLElement>(null);
  const id = useId();
  const collapsed = !mobile && !open;
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;
  useDialogFocus(mobile && open, ref);
  useEffect(() => {
    ref.current?.toggleAttribute("inert", mobile && !open);
    if (!mobile || !open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not(.workspace-sidebar)')) return;
      event.preventDefault();
      onToggleRef.current();
    };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", escape); };
  }, [mobile, open]);
  const style: CSSProperties | undefined = !mobile && topOffsetPx
    ? { top: topOffsetPx, height: `calc(100dvh - ${topOffsetPx}px)` }
    : undefined;
  const desktopPosition = position === "section" ? "fixed inset-y-0 left-0 z-50" : "sticky top-0";
  return <>
    {mobile && <div data-open={open} className="sidebar-mobile-backdrop fixed inset-0 z-[90] bg-gray-950/25 backdrop-blur-[2px]" onClick={onToggle} aria-hidden="true" />}
    <nav ref={ref} id={id} data-mobile={mobile} data-open={open} data-collapsed={collapsed} tabIndex={-1} aria-hidden={mobile && !open} aria-label={label} role={mobile && open ? "dialog" : undefined} aria-modal={(mobile && open) || undefined} style={style} className={`workspace-sidebar sidebar-motion flex h-[100dvh] flex-col border-r border-gray-200 bg-gray-50 ${mobile ? "fixed inset-y-0 left-0 z-[95] w-[280px] max-w-[85vw]" : `${desktopPosition} ${collapsed ? "w-[72px]" : "w-[248px]"}`}`}>
      <div className="sidebar-header h-20 shrink-0 items-center">
        <div className="sidebar-header-copy sidebar-label" aria-hidden={collapsed}><SidebarBrand product={product}/></div>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} title={toggleLabel} aria-label={toggleLabel} className="sidebar-toggle flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200/60 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-gray-400 md:h-8 md:w-8">{mobile ? <X size={18} aria-hidden="true" /> : open ? <PanelLeftClose size={18} aria-hidden="true" /> : <PanelLeftOpen size={18} aria-hidden="true" />}</button>
      </div>
      <div className="px-3 pb-3">{workspace}</div>
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6">{children}</div>
      {footer}
    </nav>
  </>;
}

import { useEffect, useId, useRef, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
import SidebarBrand from "./SidebarBrand";
import "./sidebar-motion.css";

type Props = {
  open: boolean; mobile?: boolean; onToggle(): void;
  product: "Enterprise" | "Personal"; label: string; toggleLabel: string;
  workspace: ReactNode; footer: ReactNode; children: ReactNode;
};

/** Product-neutral navigation rail. Product routes and permissions remain with the caller. */
export default function SidebarFrame({ open, mobile = false, onToggle, product, label, toggleLabel, workspace, footer, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const id = useId();
  const collapsed = !mobile && !open;
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
      onToggle();
    };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", escape); };
  }, [mobile, open, onToggle]);
  return <>
    {mobile && <div data-open={open} className="sidebar-mobile-backdrop fixed inset-0 z-[90] bg-gray-950/25 backdrop-blur-[2px]" onClick={onToggle} aria-hidden="true" />}
    <nav ref={ref} id={id} data-mobile={mobile} data-open={open} data-collapsed={collapsed} tabIndex={-1} aria-hidden={mobile && !open} aria-label={label} role={mobile && open ? "dialog" : undefined} aria-modal={mobile && open || undefined} className={`workspace-sidebar sidebar-motion flex h-[100dvh] flex-col border-r border-gray-200 bg-gray-50 ${mobile ? "fixed inset-y-0 left-0 z-[95] w-[280px] max-w-[85vw]" : `sticky top-0 ${collapsed ? "w-[72px]" : "w-[248px]"}`}`}>
      <div className="sidebar-header h-20 shrink-0 items-center">
        <div className="sidebar-header-copy sidebar-label" aria-hidden={collapsed}><SidebarBrand product={product}/></div>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} title={toggleLabel} aria-label={toggleLabel} className="sidebar-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200/60 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-gray-400">{mobile ? <X size={18}/> : open ? <PanelLeftClose size={17}/> : <PanelLeftOpen size={17}/>}</button>
      </div>
      <div className="px-3 pb-3">{workspace}</div>
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6">{children}</div>
      {footer}
    </nav>
  </>;
}

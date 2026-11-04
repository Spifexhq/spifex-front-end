import { useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, ChartNoAxesCombined, CheckCheck, CalendarDays, Landmark, ListTree, Network, PanelLeftClose, PanelLeftOpen, Route, Settings2, X } from "lucide-react";
import { useAppShell } from "@/contexts/AppShellContext";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
import SidebarUserConfiguration from "@/shared/layout/Sidebar/SidebarUserConfiguration";

const groups = [
  { key: "workspace", items: [{ page: "overview", key: "overview", Icon: ChartNoAxesCombined }, { page: "setup", key: "setup", Icon: CheckCheck }] },
  { key: "operations", items: [{ page: "journals", key: "journals", Icon: BookOpen }, { page: "reconciliation", key: "reconciliation", Icon: CheckCheck }, { page: "correlation", key: "correlation", Icon: Network }] },
  { key: "configuration", items: [{ page: "chart", key: "chart", Icon: ListTree }, { page: "books", key: "books", Icon: BookOpen }, { page: "periods", key: "periods", Icon: CalendarDays }, { page: "bank-mappings", key: "bankMappings", Icon: Landmark }, { page: "posting-policies", key: "postingPolicies", Icon: Route }] },
];
export default function AccountingSidebar() {
  const { t } = useTranslation("accountingSettings");
  const shell = useAppShell();
  const closeMobile = shell?.closeMobile;
  const open = shell?.mobileOpen ?? false;
  const collapsed = (shell?.collapsed ?? false) && !open;
  const nav = useRef<HTMLElement>(null);
  useDialogFocus(open, nav);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); closeMobile?.(); } };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", escape); };
  }, [open, closeMobile]);
  const row = `grid h-9 shrink-0 items-center gap-0 overflow-hidden rounded-md p-0 text-[13px] transition-[width,margin-left,grid-template-columns,color,background-color] duration-220 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-gray-400 ${collapsed ? "ml-1.5 w-9 grid-cols-[36px_176px]" : "ml-0 w-[224px] grid-cols-[48px_176px]"}`;
  const label = `min-w-0 overflow-hidden text-ellipsis whitespace-nowrap transition-opacity duration-120 motion-reduce:transition-none ${collapsed ? "pointer-events-none opacity-0" : "opacity-100 delay-70"}`;
  return <>
    <div aria-hidden="true" onClick={shell?.closeMobile} className={`fixed inset-0 z-40 bg-gray-950/25 backdrop-blur-[2px] transition-[opacity,visibility] duration-250 motion-reduce:transition-none md:hidden ${open ? "visible opacity-100" : "invisible pointer-events-none opacity-0"}`} />
    <nav ref={nav} tabIndex={-1} id="accounting-navigation" aria-label={t("section.navigation")} role={open ? "dialog" : undefined} aria-modal={open || undefined} className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col overflow-x-clip border-r border-gray-200 bg-gray-50 transition-[width,transform,visibility] duration-250 ease-out motion-reduce:transition-none md:visible md:translate-x-0 ${open ? "visible translate-x-0" : "invisible -translate-x-full"} ${collapsed ? "md:w-[72px]" : "md:w-[248px]"}`}>
      <div className="mx-3 grid h-20 w-[224px] shrink-0 grid-cols-[48px_176px] items-center">
        <div className={`col-start-2 row-start-1 pr-3 ${label}`}><Link to="/accounting" tabIndex={collapsed ? -1 : undefined} className="text-[15px] font-semibold text-gray-900">{t("section.brand")}</Link><p className="mt-0.5 truncate text-xs text-gray-500">{t("section.title")}</p></div>
        <button type="button" onClick={shell?.toggleCollapsed} className="col-start-1 row-start-1 hidden h-8 w-8 items-center justify-center justify-self-center rounded-md text-gray-500 hover:bg-gray-200/60 md:flex" aria-label={t(collapsed ? "section.expand" : "section.collapse")} aria-expanded={!collapsed} aria-controls="accounting-navigation">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
        <button type="button" onClick={shell?.closeMobile} className="col-start-1 row-start-1 flex h-8 w-8 items-center justify-center justify-self-center rounded-md text-gray-500 hover:bg-gray-200 md:hidden" aria-label={t("section.close")}><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-5">
        {groups.map(group => <section key={group.key} className="mb-5" aria-label={t(`section.${group.key}`)}><p className={`mb-2 h-5 w-[224px] pl-3 text-[11px] font-medium text-gray-400 ${label}`}>{t(`section.${group.key}`)}</p><div className="space-y-1">{group.items.map(({page,key,Icon}) => <NavLink key={page} to={`/accounting/${page}`} onClick={shell?.closeMobile} title={collapsed ? t(`nav.${key}`) : undefined} aria-label={t(`nav.${key}`)} className={({isActive}) => `${row} ${isActive ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-200/50"}`}><Icon size={16} className="shrink-0 justify-self-center" /><span className={label}>{t(`nav.${key}`)}</span></NavLink>)}</div></section>)}
      </div>
      <div className="space-y-1 border-t border-gray-200 p-3"><Link to="/settings" className={`${row} text-gray-500 hover:bg-gray-200/50`} title={t("section.settings")}><Settings2 size={16} className="shrink-0 justify-self-center" /><span className={label}>{t("section.settings")}</span></Link><Link to="/home" className={`${row} text-gray-500 hover:bg-gray-200/50`} title={t("section.back")}><ArrowLeft size={16} className="shrink-0 justify-self-center" /><span className={label}>{t("section.back")}</span></Link></div>
      <div className={`contents ${collapsed ? "[&_.sidebar-row]:ml-1.5 [&_.sidebar-row]:w-9 [&_.sidebar-row]:grid-cols-[36px_176px] [&_.sidebar-label]:pointer-events-none [&_.sidebar-label]:opacity-0" : ""}`}><SidebarUserConfiguration collapsed={collapsed} /></div>
    </nav>
  </>;
}

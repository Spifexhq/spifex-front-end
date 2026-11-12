import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, ChartNoAxesCombined, CheckCheck, CalendarDays, Landmark, ListTree, Network, Route, Settings2 } from "lucide-react";
import { useAppShell } from "@/contexts/AppShellContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import SidebarFrame from "@/shared/layout/Sidebar/SidebarFrame";
import SidebarUserConfiguration from "@/shared/layout/Sidebar/SidebarUserConfiguration";
import WorkspaceSwitcher from "@/features/workspaces/components/WorkspaceSwitcher";

const groups = [
  { key: "workspace", items: [{ page: "overview", key: "overview", Icon: ChartNoAxesCombined }, { page: "setup", key: "setup", Icon: CheckCheck }] },
  { key: "operations", items: [{ page: "journals", key: "journals", Icon: BookOpen }, { page: "reconciliation", key: "reconciliation", Icon: CheckCheck }, { page: "correlation", key: "correlation", Icon: Network }] },
  { key: "configuration", items: [{ page: "chart", key: "chart", Icon: ListTree }, { page: "books", key: "books", Icon: BookOpen }, { page: "periods", key: "periods", Icon: CalendarDays }, { page: "bank-mappings", key: "bankMappings", Icon: Landmark }, { page: "posting-policies", key: "postingPolicies", Icon: Route }] },
];

export default function AccountingSidebar() {
  const { t } = useTranslation("accountingSettings");
  const shell = useAppShell();
  const desktop = useMediaQuery("(min-width: 768px)");
  const mobile = !desktop;
  const open = mobile ? (shell?.mobileOpen ?? false) : !(shell?.collapsed ?? false);
  const collapsed = !mobile && !open;
  const toggle = mobile ? (shell?.closeMobile ?? (() => {})) : (shell?.toggleCollapsed ?? (() => {}));
  const row = `grid h-9 shrink-0 items-center gap-0 overflow-hidden rounded-md p-0 text-[13px] transition-[width,margin-left,grid-template-columns,color,background-color] duration-220 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-gray-400 ${collapsed ? "ml-1.5 w-9 grid-cols-[36px_176px]" : "ml-0 w-[224px] grid-cols-[48px_176px]"}`;
  const label = `min-w-0 overflow-hidden text-ellipsis whitespace-nowrap transition-opacity duration-120 motion-reduce:transition-none ${collapsed ? "pointer-events-none opacity-0" : "opacity-100 delay-70"}`;

  return <SidebarFrame
    open={open}
    mobile={mobile}
    onToggle={toggle}
    product="Enterprise"
    label={t("section.navigation")}
    toggleLabel={t(mobile ? "section.close" : collapsed ? "section.expand" : "section.collapse")}
    position={desktop ? "section" : "rail"}
    workspace={<WorkspaceSwitcher compact={collapsed} />}
    footer={<div className="shrink-0">
      <div className="space-y-1 border-t border-gray-200 p-3">
        <Link to="/settings" className={`${row} text-gray-500 hover:bg-gray-200/50`} title={t("section.settings")}><Settings2 size={16} className="shrink-0 justify-self-center" aria-hidden="true" /><span className={label}>{t("section.settings")}</span></Link>
        <Link to="/overview" className={`${row} text-gray-500 hover:bg-gray-200/50`} title={t("section.back")}><ArrowLeft size={16} className="shrink-0 justify-self-center" aria-hidden="true" /><span className={label}>{t("section.back")}</span></Link>
      </div>
      <SidebarUserConfiguration collapsed={collapsed} />
    </div>}
  >
    {groups.map(group => <section key={group.key} className="mb-5" aria-label={t(`section.${group.key}`)}><p className={`mb-2 h-5 w-[224px] pl-3 text-[11px] font-medium text-gray-500 ${label}`}>{t(`section.${group.key}`)}</p><div className="space-y-1">{group.items.map(({page,key,Icon}) => <NavLink key={page} to={`/accounting/${page}`} onClick={shell?.closeMobile} title={collapsed ? t(`nav.${key}`) : undefined} aria-label={t(`nav.${key}`)} className={({isActive}) => `${row} ${isActive ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-200/50"}`}><Icon size={16} className="shrink-0 justify-self-center" aria-hidden="true" /><span className={label}>{t(`nav.${key}`)}</span></NavLink>)}</div></section>)}
  </SidebarFrame>;
}

import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, ChartNoAxesCombined, CalendarDays, Landmark, ListTree, LockKeyhole, Route, Settings2 } from "lucide-react";
import { useAppShell } from "@/contexts/AppShellContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import SidebarFrame from "@/shared/layout/Sidebar/SidebarFrame";
import SidebarTooltip from "@/shared/ui/SidebarTooltip";
import SidebarUserConfiguration from "@/shared/layout/Sidebar/SidebarUserConfiguration";
import WorkspaceSwitcher from "@/features/workspaces/components/WorkspaceSwitcher";
import { useAccountingSetup } from "../setup/useAccountingSetup";
import { accountingRouteAllowed } from "../setup/setupNavigation";

const groups = [
  { key: "workspace", items: [{ page: "overview", key: "overview", Icon: ChartNoAxesCombined }] },
  { key: "operations", items: [{ page: "journals", key: "journals", Icon: BookOpen }] },
  { key: "configuration", items: [{ page: "chart-of-accounts", key: "chart", Icon: ListTree }, { page: "books", key: "books", Icon: BookOpen }, { page: "periods", key: "periods", Icon: CalendarDays }, { page: "bank-mappings", key: "bankMappings", Icon: Landmark }, { page: "posting-policies", key: "postingPolicies", Icon: Route }] },
];

export default function AccountingSidebar() {
  const { t } = useTranslation("accountingSettings");
  const shell = useAppShell();
  const { status } = useAccountingSetup();
  const desktop = useMediaQuery("(min-width: 768px)");
  const mobile = !desktop;
  const open = mobile ? (shell?.mobileOpen ?? false) : !(shell?.collapsed ?? false);
  const collapsed = !mobile && !open;
  const toggle = mobile ? (shell?.closeMobile ?? (() => {})) : (shell?.toggleCollapsed ?? (() => {}));
  const row = `grid h-9 shrink-0 items-center gap-0 overflow-hidden rounded-md p-0 text-[13px] transition-[width,margin-left,grid-template-columns,color,background-color] duration-220 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-gray-400 ${collapsed ? "ml-1.5 w-9 grid-cols-[36px_176px]" : "ml-0 w-[224px] grid-cols-[48px_176px]"}`;
  const label = `min-w-0 overflow-hidden text-ellipsis whitespace-nowrap transition-opacity duration-120 motion-reduce:transition-none ${collapsed ? "pointer-events-none opacity-0" : "opacity-100 delay-70"}`;
  const allowed = (page: string) => status ? accountingRouteAllowed(status, page) : page === "overview";

  return <SidebarFrame
    open={open}
    mobile={mobile}
    onToggle={toggle}
    product="Business"
    label={t("section.navigation")}
    toggleLabel={t(mobile ? "section.close" : collapsed ? "section.expand" : "section.collapse")}
    position={desktop ? "section" : "rail"}
    workspace={<WorkspaceSwitcher compact={collapsed} />}
    footer={<div className="shrink-0">
      <div className="space-y-1 border-t border-gray-200 p-3">
        <SidebarTooltip label={t("section.settings")} collapsed={collapsed}>
          <Link to="/settings" aria-label={t("section.settings")} className={`${row} text-gray-500 hover:bg-gray-200/50`}><Settings2 size={16} className="shrink-0 justify-self-center" aria-hidden="true" /><span className={label}>{t("section.settings")}</span></Link>
        </SidebarTooltip>
        <SidebarTooltip label={t("section.back")} collapsed={collapsed}>
          <Link to="/overview" aria-label={t("section.back")} className={`${row} text-gray-500 hover:bg-gray-200/50`}><ArrowLeft size={16} className="shrink-0 justify-self-center" aria-hidden="true" /><span className={label}>{t("section.back")}</span></Link>
        </SidebarTooltip>
      </div>
      <SidebarUserConfiguration collapsed={collapsed} />
    </div>}
  >
    {groups.map(group => <section key={group.key} className="mb-5" aria-label={t(`section.${group.key}`)}>
      <p className={`mb-2 h-5 w-[224px] pl-3 text-[11px] font-medium text-gray-500 ${label}`}>{t(`section.${group.key}`)}</p>
      <div className="space-y-1">{group.items.map(({page,key,Icon}) => {
        const itemLabel = t(`nav.${key}`);
        const itemAllowed = allowed(page);
        const content = <><Icon size={16} className="shrink-0 justify-self-center" aria-hidden="true" /><span className={label}>{itemLabel}</span></>;
        return <SidebarTooltip key={page} label={itemAllowed ? itemLabel : `${itemLabel} — ${t("section.locked")}`} collapsed={collapsed}>
          {itemAllowed ? <NavLink to={`/accounting/${page}`} onClick={shell?.closeMobile} aria-label={itemLabel} className={({isActive}) => `${row} ${isActive ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-200/50"}`}>{content}</NavLink>
            : <span aria-disabled="true" className={`${row} cursor-not-allowed text-gray-400 opacity-60`}><LockKeyhole size={16} className="shrink-0 justify-self-center" aria-hidden="true" /><span className={label}>{itemLabel}</span></span>}
        </SidebarTooltip>;
      })}</div>
    </section>)}
  </SidebarFrame>;
}

import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import { ArrowLeft, Bell, CalendarClock, CreditCard, Landmark, SlidersHorizontal, Tags, UserRound, WalletCards, Bot } from "lucide-react";
import SidebarFrame from "@/shared/layout/Sidebar/SidebarFrame";
import SidebarUserConfiguration from "@/shared/layout/Sidebar/SidebarUserConfiguration";
import WorkspaceSwitcher from "@/features/workspaces/components/WorkspaceSwitcher";

type Props = { open: boolean; mobile: boolean; collapsed: boolean; onToggle(): void; onMobileClose(): void };
const groups = [
  { id: "account", items: [{ id: "personal", Icon: UserRound }, { id: "notifications", Icon: Bell }, { id: "security", Icon: SlidersHorizontal }, { id: "ai-connections", Icon: Bot }, { id: "billing", Icon: CreditCard }] },
  { id: "preferences", items: [{ id: "formats", Icon: CalendarClock }, { id: "currency", Icon: Landmark }] },
  { id: "banking", items: [{ id: "accounts", Icon: Landmark }, { id: "categories", Icon: Tags }] },
  { id: "workspace", items: [{ id: "workspaces", Icon: WalletCards }] },
];

export default function PersonalSettingsSidebar({ open, mobile, collapsed, onToggle, onMobileClose }: Props) {
  const { t } = useTranslation(["personal", "personalSettings"]);
  const location = useLocation();
  const active = location.pathname.split("/")[3] || "profile";
  const railCollapsed = collapsed && !mobile;
  return <SidebarFrame open={open} mobile={mobile} onToggle={onToggle} product="Personal" label={t("settingsNavigation")} toggleLabel={t(!mobile && collapsed ? "expandNavigation" : "collapseNavigation")} workspace={<WorkspaceSwitcher compact={railCollapsed} />} footer={<>
    <div className="shrink-0 border-t border-gray-200 p-3"><NavLink to="/personal/overview" onClick={onMobileClose} title={railCollapsed ? t("backToWorkspace") : undefined} className="sidebar-row rounded-md text-xs text-gray-500 hover:bg-gray-100"><ArrowLeft size={16} className="sidebar-icon"/><span className="sidebar-label">{t("backToWorkspace")}</span></NavLink></div>
    <SidebarUserConfiguration collapsed={railCollapsed} onNavigate={onMobileClose} destinations={{ personal: "/personal/settings/personal", notifications: "/personal/settings/notifications", help: "/personal/help" }}/>
  </>}>
    {groups.map(group => <section key={group.id} className="mb-5" aria-label={t(`settingsSections.${group.id}`)}>
      <div className="sidebar-section-title text-[11px] font-medium text-gray-400"><span className="sidebar-label">{t(`settingsSections.${group.id}`)}</span></div>
      <ul className="space-y-1">{group.items.map(({ id, Icon }) => { const key = id === "personal" ? "profile" : id; const label = id === "personal" ? t("personalSettings:title") : t(`settingsPages.${key}.title`); return <li key={id}><NavLink to={`/personal/settings/${id}`} onClick={onMobileClose} title={railCollapsed ? label : undefined} aria-label={label} aria-current={active === id ? "page" : undefined} className={`sidebar-row group rounded-md text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-gray-400 ${active === id ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"}`}><Icon size={16} className="sidebar-icon" aria-hidden="true"/><span className="sidebar-label">{label}</span></NavLink></li>; })}</ul>
    </section>)}
  </SidebarFrame>;
}

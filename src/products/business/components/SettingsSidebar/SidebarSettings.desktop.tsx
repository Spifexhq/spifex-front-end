import SidebarUserConfiguration from "../../../../shared/layout/Sidebar/SidebarUserConfiguration";
import WorkspaceSwitcher from "@/features/workspaces/components/WorkspaceSwitcher";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, Bell, Shield, Building2, Users, Layers3, Landmark, CreditCard, BookOpen, BookOpenText, UsersRound, Network, Boxes, FolderKanban, IdCard, ListTree, ArrowLeft, PanelsTopLeft, CalendarClock, Coins, Bot } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import SidebarFrame from "@/shared/layout/Sidebar/SidebarFrame";
import type { SidebarSettingsProps } from "./SidebarSettings";

const Icons = { personal: SlidersHorizontal, bell: Bell, shield: Shield, building: Building2, workspaces: PanelsTopLeft, members: Users, groups: UsersRound, layers: Layers3, bank: Landmark, category: ListTree, card: CreditCard, ledger: BookOpen, accounting: BookOpenText, entities: IdCard, inventory: Boxes, projects: FolderKanban, departments: Network, formats: CalendarClock, currency: Coins, ai: Bot };
type SidebarSection = { title: string; id: string; items: { id: string; icon: keyof typeof Icons; label: string; permission: string }[] };

export default function SidebarSettingsDesktop({ activeItem, topOffsetPx = 0, mobileOpen = false, onMobileClose, collapsed = false, onToggleCollapsed }: SidebarSettingsProps) {
  const { permissions, isOwner } = useAuthContext();
  const { t } = useTranslation("settingsSidebar");
  const desktop = useMediaQuery("(min-width: 768px)");
  const mobile = !desktop;
  const open = mobile ? mobileOpen : !collapsed;
  const frameCollapsed = !mobile && !open;
  const toggle = mobile ? (onMobileClose ?? (() => {})) : (onToggleCollapsed ?? (() => {}));
  const sections: SidebarSection[] = useMemo(
    () => [
      {
        title: "",
        id: "me",
        items: [
          { id: "personal", icon: "personal", label: t("items.personal"), permission: "view_personal_settings_page" },
          { id: "notifications", icon: "bell", label: t("items.notifications"), permission: "view_notification_settings_page" },
          { id: "security", icon: "shield", label: t("items.security"), permission: "view_security_and_privacy_page" },
          { id: "ai-connections", icon: "ai", label: t("items.ai-connections"), permission: "view_ai_connections" },
        ],
      },
      {
        title: t("sections.organization"),
        id: "org",
        items: [
          { id: "organization-settings", icon: "building", label: t("items.organization-settings"), permission: "view_organization_settings_page" },
          { id: "billing", icon: "layers", label: t("items.billing"), permission: "view_billing_page" },
        ],
      },
      {
        title: t("sections.preferences"),
        id: "preferences",
        items: [
          { id: "manage-formats", icon: "formats", label: t("items.formats"), permission: "view_format_settings_page" },
          { id: "manage-currency", icon: "currency", label: t("items.currency"), permission: "view_currency_settings_page" },
        ],
      },
      {
        title: t("sections.workspace"),
        id: "workspace",
        items: [
          { id: "workspaces", icon: "workspaces", label: t("items.workspaces"), permission: "view_organization_settings_page" },
        ],
      },
      {
        title: t("sections.team"),
        id: "team",
        items: [
          { id: "members", icon: "members", label: t("items.members"), permission: "view_member_settings_page" },
          { id: "groups", icon: "groups", label: t("items.groups"), permission: "view_group_settings_page" },
        ],
      },
      {
        title: t("sections.banking"),
        id: "banking",
        items: [
          { id: "banks", icon: "bank", label: t("items.banks"), permission: "view_bank_settings_page" },
          { id: "categories", icon: "category", label: t("items.categories"), permission: "view_bank_settings_page" }, // view_category_settings_page
        ],
      },
      {
        title: t("sections.management"),
        id: "mgmt",
        items: [
          { id: "projects", icon: "projects", label: t("items.projects"), permission: "view_project_settings_page" },
          { id: "inventory", icon: "inventory", label: t("items.inventory"), permission: "view_inventory_settings_page" },
          { id: "entities", icon: "entities", label: t("items.entities"), permission: "view_entity_settings_page" },
          { id: "departments", icon: "departments", label: t("items.departments"), permission: "view_department_settings_page" },
        ],
      },
    ],
    [t]
  );

  const visibleSections = sections.map(section => ({ ...section, items: section.items.filter(item => isOwner || permissions.includes(item.permission)) })).filter(section => section.items.length);

  return <SidebarFrame
    open={open}
    mobile={mobile}
    onToggle={toggle}
    product="Enterprise"
    label={t("aria.nav")}
    toggleLabel={t(mobile ? "actions.close" : frameCollapsed ? "actions.expand" : "actions.collapse")}
    position={desktop ? "section" : "rail"}
    topOffsetPx={topOffsetPx}
    workspace={<WorkspaceSwitcher compact={frameCollapsed} />}
    footer={<div className="shrink-0">
      <div className="border-t border-gray-200 p-3">
        <NavLink to="/" title={t("actions.back", "Back to workspace")} className="sidebar-row rounded-md text-xs text-gray-500 hover:bg-gray-100"><ArrowLeft size={16} className="sidebar-icon" aria-hidden="true" /><span className="sidebar-label">{t("actions.back", "Back to workspace")}</span></NavLink>
      </div>
      <SidebarUserConfiguration collapsed={frameCollapsed} />
    </div>}
  >
    {visibleSections.map(section => <section key={section.id} className="mb-5" aria-label={section.title || t("sections.profile", "Your account")}>
      <div className="sidebar-section-title text-[11px] font-medium text-gray-500">
        <span className="sidebar-label">{section.title || t("sections.profile", "Your account")}</span>
      </div>
      <ul className="space-y-1">{section.items.map(item => {
        const Icon = Icons[item.icon];
        return <li key={item.id}><NavLink to={`/settings/${item.id}`} onClick={mobile ? onMobileClose : undefined} title={frameCollapsed ? item.label : undefined} aria-label={item.label} aria-current={activeItem === item.id ? "page" : undefined}
          className={`sidebar-row group rounded-md text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-gray-400 ${activeItem === item.id ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"}`}>
          <Icon size={16} className="sidebar-icon" aria-hidden="true" /><span className="sidebar-label">{item.label}</span>
        </NavLink></li>;
      })}</ul>
    </section>)}
  </SidebarFrame>;
}

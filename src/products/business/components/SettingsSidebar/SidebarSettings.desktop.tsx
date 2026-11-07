import SidebarUserConfiguration from "../../../../shared/layout/Sidebar/SidebarUserConfiguration";
import SidebarBrand from "@/shared/layout/Sidebar/SidebarBrand";
import "../../../../shared/layout/Sidebar/sidebar-motion.css";
import { useEffect, useMemo, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, Bell, Shield, Building2, Users, Layers3, Landmark, CreditCard, BookOpen, BookOpenText, UsersRound, Network, Boxes, FolderKanban, IdCard, ListTree, PanelLeftClose, PanelLeftOpen, X, ArrowLeft, PanelsTopLeft } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import type { SidebarSettingsProps } from "./SidebarSettings";
const Icons = { personal: SlidersHorizontal, bell: Bell, shield: Shield, building: Building2, workspaces: PanelsTopLeft, members: Users, groups: UsersRound, layers: Layers3, bank: Landmark, category: ListTree, card: CreditCard, ledger: BookOpen, accounting: BookOpenText, entities: IdCard, inventory: Boxes, projects: FolderKanban, departments: Network };
type SidebarSection = { title: string; id: string; items: { id: string; icon: keyof typeof Icons; label: string; permission: string }[] };
export default function SidebarSettingsDesktop({ activeItem, topOffsetPx = 0, mobileOpen = false, onMobileClose, collapsed = false, onToggleCollapsed }: SidebarSettingsProps) {
  const { permissions, isOwner } = useAuthContext();
  const { t } = useTranslation("settingsSidebar");
  const navRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sections: SidebarSection[] = useMemo(
    () => [
      {
        title: "",
        id: "me",
        items: [
          { id: "personal", icon: "personal", label: t("items.personal"), permission: "view_personal_settings_page" },
          { id: "notifications", icon: "bell", label: t("items.notifications"), permission: "view_notification_settings_page" },
          { id: "security", icon: "shield", label: t("items.security"), permission: "view_security_and_privacy_page" },
        ],
      },
      {
        title: t("sections.organization"),
        id: "org",
        items: [
          { id: "organization-settings", icon: "building", label: t("items.organization-settings"), permission: "view_organization_settings_page" },
          { id: "workspaces", icon: "workspaces", label: t("items.workspaces"), permission: "view_organization_settings_page" },
          { id: "members", icon: "members", label: t("items.members"), permission: "view_member_settings_page" },
          { id: "groups", icon: "groups", label: t("items.groups"), permission: "view_group_settings_page" },
          { id: "subscription-management", icon: "layers", label: t("items.subscription-management"), permission: "view_subscription_management_page" },
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
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMobileClose?.();
      if (event.key !== "Tab") return;
      const elements = Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []).filter(el => el.getClientRects().length);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [mobileOpen, onMobileClose]);
  return <>
    {<div data-open={mobileOpen} className="sidebar-mobile-backdrop fixed inset-0 z-40 bg-gray-950/25 backdrop-blur-[2px] md:hidden" onClick={onMobileClose} aria-hidden="true" />}
    <nav ref={navRef} id="settings-navigation" data-mobile="true" data-open={mobileOpen} data-collapsed={collapsed && !mobileOpen} aria-label={t("aria.nav")} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined}
      className={`sidebar-motion fixed left-0 z-50 flex flex-col border-r border-gray-200 bg-gray-50 ${collapsed ? "md:w-[72px]" : "md:w-[248px]"} w-[280px] max-w-[85vw] `}
      style={{ top: topOffsetPx, height: `calc(100dvh - ${topOffsetPx}px)` }}>
      <div className="sidebar-header h-20 shrink-0 items-center">
        <div className="sidebar-header-copy sidebar-label" aria-hidden={collapsed && !mobileOpen}>
          <SidebarBrand product="Enterprise"/>
        </div>
        <button type="button" onClick={onToggleCollapsed} aria-expanded={!collapsed} aria-controls="settings-navigation" title={t(collapsed ? "actions.expand" : "actions.collapse")} aria-label={t(collapsed ? "actions.expand" : "actions.collapse")} className="sidebar-toggle hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200/60 focus-visible:outline-2 focus-visible:outline-gray-500 md:inline-flex">
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button ref={closeRef} type="button" onClick={onMobileClose} aria-label={t("actions.close", "Close navigation")} className="sidebar-toggle rounded-md p-2 hover:bg-gray-100 md:hidden"><X size={18} /></button>
      </div>
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {visibleSections.map(section => <section key={section.id} className="mb-5" aria-label={section.title || t("sections.profile", "Your account")}>
          <div className="sidebar-section-title text-[11px] font-medium text-gray-400">
            <span className="sidebar-label">{section.title || t("sections.profile", "Your account")}</span>
          </div>
          <ul className="space-y-1">{section.items.map(item => {
            const Icon = Icons[item.icon];
            return <li key={item.id}><NavLink to={`/settings/${item.id}`} onClick={onMobileClose} title={collapsed ? item.label : undefined} aria-label={item.label} aria-current={activeItem === item.id ? "page" : undefined}
              className={`sidebar-row group rounded-md text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-gray-400 ${activeItem === item.id ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"}`}>
              <Icon size={16} className="sidebar-icon" aria-hidden="true" /><span className="sidebar-label">{item.label}</span>
            </NavLink></li>;
          })}</ul>
        </section>)}
      </div>
      <div className="shrink-0 border-t border-gray-200 p-3">
        <NavLink to="/" title={t("actions.back", "Back to workspace")} className="sidebar-row rounded-md text-xs text-gray-500 hover:bg-gray-100"><ArrowLeft size={16} className="sidebar-icon" /><span className="sidebar-label">{t("actions.back", "Back to workspace")}</span></NavLink>
      </div>
      <SidebarUserConfiguration collapsed={collapsed && !mobileOpen} />
    </nav>
  </>;
}

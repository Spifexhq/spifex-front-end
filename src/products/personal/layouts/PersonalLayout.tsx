import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, LayoutDashboard, ArrowLeftRight, Landmark, Tags, CircleGauge, Target, ChartNoAxesCombined, Settings2 } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import SidebarFrame from "@/shared/layout/Sidebar/SidebarFrame";
import SidebarUserConfiguration from "@/shared/layout/Sidebar/SidebarUserConfiguration";
import WorkspaceSwitcher from "@/features/workspaces/components/WorkspaceSwitcher";
import WorkspaceLifecycleBanner from "@/features/workspaces/components/WorkspaceLifecycleBanner";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";

const navigation = [{ key: "overview", Icon: LayoutDashboard }, { key: "transactions", Icon: ArrowLeftRight }, { key: "accounts", Icon: Landmark }, { key: "categories", Icon: Tags }, { key: "budgets", Icon: CircleGauge }, { key: "goals", Icon: Target }, { key: "reports", Icon: ChartNoAxesCombined }, { key: "settings", Icon: Settings2 }];

export default function PersonalLayout() {
  const { t } = useTranslation("personal");
  const { organization } = useAuthContext();
  const location = useLocation();
  const section = location.pathname.split("/")[2] || "overview";
  const [mobile, setMobile] = useState(false);
  const [desktop, setDesktop] = useState(() => matchMedia("(min-width: 768px)").matches);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("spifex.personal.collapsed") === "true"; } catch { return false; } });
  const main = useRef<HTMLDivElement>(null);
  const closeMobile = useCallback(() => setMobile(false), []);
  const toggle = useCallback(() => {
    if (!desktop) { setMobile(value => !value); return; }
    setCollapsed(value => { const next = !value; try { localStorage.setItem("spifex.personal.collapsed", String(next)); } catch { /* Optional persistence. */ } return next; });
  }, [desktop]);
  useEffect(() => { closeMobile(); document.title = `${t(section)} · Spifex Personal`; }, [location.pathname, location.search, section, t, closeMobile]);
  useEffect(() => {
    const media = matchMedia("(min-width: 768px)");
    const update = () => { setDesktop(media.matches); if (media.matches) closeMobile(); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [closeMobile]);
  useEffect(() => { main.current?.toggleAttribute("inert", !desktop && mobile); }, [desktop, mobile]);
  if (organization?.organization?.product_category !== "personal") return <Navigate to="/overview" replace/>;
  const railCollapsed = desktop && collapsed;
  return <div className="h-dvh overflow-hidden bg-white text-gray-900">
    <div className="fixed inset-y-0 left-0 z-40">
      <SidebarFrame open={desktop ? !collapsed : mobile} mobile={!desktop} onToggle={toggle} product="Personal" label={t("navigation")} toggleLabel={t(!desktop && mobile ? "close" : "toggleNavigation")} workspace={<WorkspaceSwitcher compact={railCollapsed}/>} footer={<SidebarUserConfiguration collapsed={railCollapsed} onNavigate={closeMobile} destinations={{ personal: "/personal/settings", notifications: "/personal/settings?section=notifications", help: "/personal/help" }}/> }>
        <ul className="space-y-1">{navigation.map(({ key, Icon }) => <li key={key}><NavLink to={`/personal/${key}`} title={railCollapsed ? t(key) : undefined} onClick={closeMobile} className={({ isActive }) => `sidebar-row rounded-md text-[13px] ${isActive ? "bg-gray-200/70 font-medium text-gray-900" : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"}`}><Icon size={16} className="sidebar-icon"/><span className="sidebar-label">{t(key)}</span></NavLink></li>)}</ul>
      </SidebarFrame>
    </div>
    <div ref={main} className={`flex h-full min-w-0 flex-col transition-[margin-left] duration-[220ms] ease-out motion-reduce:transition-none ${collapsed ? "md:ml-[72px]" : "md:ml-[248px]"}`}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6"><button type="button" aria-label={t("navigation")} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 md:hidden" onClick={toggle}><Menu size={18}/></button><p className="text-xs text-gray-500">Personal <span className="mx-2 text-gray-300">/</span><span className="font-medium text-gray-800">{t(section)}</span></p></header>
      <WorkspaceLifecycleBanner/>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7"><div className="mx-auto max-w-[1440px]"><Suspense fallback={<PageSkeleton rows={7}/>}><Outlet/></Suspense></div></main>
    </div>
  </div>;
}

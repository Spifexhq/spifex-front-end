import WorkspaceLifecycleBanner from "@/features/workspaces/components/WorkspaceLifecycleBanner";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppShellContext } from "@/contexts/AppShellContext";
import { Sidebar } from "@/products/business/components/Sidebar";
import { Navbar } from "@/shared/layout/Navbar";
import type { ConfigurationStatus } from "@/models/auth/configuration";
import "./shell.css";

const readCollapsed = (key: string, fallback: boolean) => {
  try { const value = localStorage.getItem(key); return value === null ? fallback : value === "true"; } catch { return fallback; }
};
export default function ApplicationShell({ children, onboarding, showOnboardingWarning }: { children: ReactNode; onboarding?: ConfigurationStatus | null; showOnboardingWarning?: boolean }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const settings = pathname.startsWith("/settings");
  const accounting = /^\/accounting(?:\/|$)/.test(pathname);
  const section = settings || accounting;
  const pageHasActions = /^\/(cashflow|settled)\/?$/.test(pathname);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(() => readCollapsed("spifex.workspace.collapsed", false));
  const [settingsCollapsed, setSettingsCollapsed] = useState(() => readCollapsed("spifex.settings.collapsed", false));
  const [accountingCollapsed, setAccountingCollapsed] = useState(() => readCollapsed("spifex.accounting.collapsed", false));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [financialRevision, setFinancialRevision] = useState(0);
  const refreshFinance = useCallback(() => setFinancialRevision(value => value + 1), []);
  const [sidebarSlot, setSidebarSlot] = useState<HTMLDivElement | null>(null);
  const collapsed = accounting ? accountingCollapsed : settings ? settingsCollapsed : workspaceCollapsed;
  const toggleCollapsed = useCallback(() => {
    const setter = accounting ? setAccountingCollapsed : settings ? setSettingsCollapsed : setWorkspaceCollapsed;
    setter(previous => {
      const next = !previous;
      try { localStorage.setItem(accounting ? "spifex.accounting.collapsed" : settings ? "spifex.settings.collapsed" : "spifex.workspace.collapsed", String(next)); } catch { /* Optional persistence. */ }
      return next;
    });
  }, [settings, accounting]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen(previous => !previous), []);
  const openHelp = useCallback(() => { setMobileOpen(false); navigate("/help"); }, [navigate]);
  useEffect(closeMobile, [pathname, closeMobile]);
  useEffect(() => {
    const media = matchMedia("(min-width: 768px)");
    const close = () => { if (media.matches) closeMobile(); };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, [closeMobile]);
  const value = useMemo(() => ({ collapsed, toggleCollapsed, mobileOpen, toggleMobile, closeMobile, sidebarSlot, openHelp, financialRevision }), [collapsed, toggleCollapsed, mobileOpen, toggleMobile, closeMobile, sidebarSlot, openHelp, financialRevision]);
  return <AppShellContext.Provider value={value}>
    <div className="app-shell h-[100dvh] overflow-hidden bg-white text-gray-900">
      {!section && <div ref={setSidebarSlot} className="fixed inset-y-0 left-0 z-40" />}
      {!section && !pageHasActions && <Sidebar isOpen={!collapsed} toggleSidebar={toggleCollapsed} mode="default" onEntriesSaved={refreshFinance} onTransferenceSaved={refreshFinance} />}
      <div className={`app-shell-content flex h-full min-w-0 flex-col ${collapsed ? "md:ml-[72px]" : "md:ml-[248px]"}`}>
        <Navbar onboarding={onboarding} showOnboardingWarning={showOnboardingWarning} />
        <WorkspaceLifecycleBanner />
        <div id="app-page-scroll" className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  </AppShellContext.Provider>;
}

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppShellContext } from "@/contexts/AppShellContext";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Navbar } from "@/shared/layout/Navbar";
import SimulatedAI from "@/components/SimulatedAI";
import type { OnboardingStatus } from "@/models/auth/onboarding";
import "./shell.css";

const readCollapsed = (key: string, fallback: boolean) => {
  try { const value = localStorage.getItem(key); return value === null ? fallback : value === "true"; } catch { return fallback; }
};
export default function ApplicationShell({ children, onboarding, showOnboardingWarning }: { children: ReactNode; onboarding?: OnboardingStatus | null; showOnboardingWarning?: boolean }) {
  const { pathname } = useLocation();
  const settings = pathname.startsWith("/settings");
  const pageHasActions = /^\/(cashflow|settled)\/?$/.test(pathname);
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(() => readCollapsed("spifex.workspace.collapsed", false));
  const [settingsCollapsed, setSettingsCollapsed] = useState(() => readCollapsed("spifex.settings.collapsed", false));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarSlot, setSidebarSlot] = useState<HTMLDivElement | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const collapsed = settings ? settingsCollapsed : workspaceCollapsed;
  const toggleCollapsed = useCallback(() => {
    const setter = settings ? setSettingsCollapsed : setWorkspaceCollapsed;
    setter(previous => {
      const next = !previous;
      try { localStorage.setItem(settings ? "spifex.settings.collapsed" : "spifex.workspace.collapsed", String(next)); } catch { /* Optional persistence. */ }
      return next;
    });
  }, [settings]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen(previous => !previous), []);
  const openHelp = useCallback(() => { setMobileOpen(false); setHelpOpen(true); }, []);
  useEffect(closeMobile, [pathname, closeMobile]);
  useEffect(() => {
    const media = matchMedia("(min-width: 768px)");
    const close = () => { if (media.matches) closeMobile(); };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, [closeMobile]);
  const value = useMemo(() => ({ collapsed, toggleCollapsed, mobileOpen, toggleMobile, closeMobile, sidebarSlot, openHelp }), [collapsed, toggleCollapsed, mobileOpen, toggleMobile, closeMobile, sidebarSlot, openHelp]);
  return <AppShellContext.Provider value={value}>
    <div className="app-shell h-[100dvh] overflow-hidden bg-white text-gray-900">
      {!settings && <div ref={setSidebarSlot} className="fixed inset-y-0 left-0 z-40" />}
      {!settings && !pageHasActions && <Sidebar isOpen={!collapsed} toggleSidebar={toggleCollapsed} mode="default" />}
      <div className={`app-shell-content flex h-full min-w-0 flex-col ${collapsed ? "md:ml-[72px]" : "md:ml-[248px]"}`}>
        <Navbar onboarding={onboarding} showOnboardingWarning={showOnboardingWarning} />
        <div id="app-page-scroll" className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
    <SimulatedAI isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
  </AppShellContext.Provider>;
}

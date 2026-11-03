import { Suspense } from "react";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { SettingsUiContext } from "@/shared/ui/Settings/SettingsUiContext";
import "./settings.css";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarSettings } from "@/shared/layout/Sidebar";
import { useAppShell } from "@/contexts/AppShellContext";
export const SettingsLayout = () => {
  const shell = useAppShell();
  const { pathname } = useLocation();
  const [, , slug, setupSlug] = pathname.split("/");
  const activeItem = slug === "register" && setupSlug === "ledger-accounts" ? "ledger-accounts" : slug || "personal";
  return <>
    <SidebarSettings activeItem={activeItem} topOffsetPx={0} collapsed={shell?.collapsed ?? false} onToggleCollapsed={shell?.toggleCollapsed} mobileOpen={shell?.mobileOpen ?? false} onMobileClose={shell?.closeMobile} />
    <SettingsUiContext.Provider value={{ settings: true }}><div className="settings-surface"><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></div></SettingsUiContext.Provider>
  </>;
};
export default SettingsLayout;

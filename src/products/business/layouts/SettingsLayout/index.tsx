import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { getPageTitleKey } from "@/shared/layout/Navbar/pageTitle";
import { productPathname } from "@/app/routing/productPaths";
import SectionLayout from "@/shared/layout/SectionLayout";

import SettingsSurface from "@/shared/ui/Settings/SettingsSurface";
import { SettingsPageSkeleton } from "@/shared/ui/Loaders/PageSkeleton";

import { Outlet, useLocation } from "react-router-dom";
import { default as SidebarSettings } from "@/products/business/components/SettingsSidebar/SidebarSettings";
import { useAppShell } from "@/contexts/AppShellContext";
// Tailwind variants preserve the existing Settings density and responsive controls.


export const SettingsLayout = () => {
  const shell = useAppShell();
  const { t } = useTranslation(["navbar", "settingsSidebar", "accountingSettings"]);
  const { pathname } = useLocation();
  const [, , , slug, setupSlug] = productPathname(pathname).split("/");
  const activeItem = slug === "register" && setupSlug === "ledger-accounts" ? "ledger-accounts" : slug || "personal";
  return <SectionLayout
    sidebar={<SidebarSettings activeItem={activeItem} topOffsetPx={0} collapsed={shell?.collapsed ?? false} onToggleCollapsed={shell?.toggleCollapsed} mobileOpen={shell?.mobileOpen ?? false} onMobileClose={shell?.closeMobile} />}
    heading={<div className="px-4 pt-5 md:px-7 md:pt-6"><header className="mx-auto w-full min-w-0 max-w-[1440px]"><h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t(getPageTitleKey(pathname))}</h1></header></div>}
  ><SettingsSurface><Suspense fallback={<SettingsPageSkeleton variant="settings-table" />}><Outlet /></Suspense></SettingsSurface></SectionLayout>;
};
export default SettingsLayout;

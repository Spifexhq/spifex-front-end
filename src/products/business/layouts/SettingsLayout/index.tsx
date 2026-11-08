import { useTranslation } from "react-i18next";
import { getPageTitleKey, getSettingsDescriptionKey } from "@/shared/layout/Navbar/pageTitle";
import SectionLayout from "@/shared/layout/SectionLayout";

import SettingsSurface from "@/shared/ui/Settings/SettingsSurface";

import { Outlet, useLocation } from "react-router-dom";
import { default as SidebarSettings } from "@/products/business/components/SettingsSidebar/SidebarSettings";
import { useAppShell } from "@/contexts/AppShellContext";
// Tailwind variants preserve the existing Settings density and responsive controls.


export const SettingsLayout = () => {
  const shell = useAppShell();
  const { t } = useTranslation(["navbar", "settingsSidebar", "accountingSettings"]);
  const { pathname } = useLocation();
  const [, , slug, setupSlug] = pathname.split("/");
  const activeItem = slug === "register" && setupSlug === "ledger-accounts" ? "ledger-accounts" : slug || "personal";
  return <SectionLayout
    sidebar={<SidebarSettings activeItem={activeItem} topOffsetPx={0} collapsed={shell?.collapsed ?? false} onToggleCollapsed={shell?.toggleCollapsed} mobileOpen={shell?.mobileOpen ?? false} onMobileClose={shell?.closeMobile} />}
    heading={<div className="px-4 pt-5 md:px-7 md:pt-6"><header className="mx-auto w-full min-w-0 max-w-[1440px]"><h1 className="text-xl font-semibold tracking-tight text-gray-900">{t(getPageTitleKey(pathname))}</h1><p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-gray-500">{t(getSettingsDescriptionKey(pathname), { defaultValue: t("navbar:settingsDescription") })}</p></header></div>}
  ><SettingsSurface><Outlet /></SettingsSurface></SectionLayout>;
};
export default SettingsLayout;

import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, AlertTriangle, PanelsTopLeft, ChevronRight } from "lucide-react";
import { useAppShell } from "@/contexts/AppShellContext";
import NotificationsMenu from "@/shared/layout/NotificationsMenu";
import type { ConfigurationStatus } from "@/models/auth/configuration";
import { getPageBreadcrumbs } from "./pageTitle";

type NavbarProps = { onboarding?: ConfigurationStatus | null; showOnboardingWarning?: boolean };
export default function Navbar({ showOnboardingWarning = false }: NavbarProps) {
  const { t } = useTranslation(["navbar", "settingsSidebar", "accountingSettings"]);
  const { pathname } = useLocation();
  const breadcrumbs = getPageBreadcrumbs(pathname);
  const shell = useAppShell();
  return <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 sm:px-6" aria-label={t("navbar:header")}>
    <div className="flex min-w-0 items-center gap-3">
      <button type="button" className="grid h-11 w-11 place-items-center rounded-md p-0 text-gray-500 hover:bg-gray-50 md:hidden" onClick={shell?.toggleMobile} aria-label={t("navbar:actions.open")} aria-expanded={shell?.mobileOpen ?? false}><Menu size={18} aria-hidden="true" /></button>
      <PanelsTopLeft size={16} className="hidden shrink-0 text-gray-400 sm:block" aria-hidden="true" />
      <nav id="app-page-title" aria-label={t("navbar:aria.breadcrumb")} className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px] sm:gap-2">
          {breadcrumbs.map((crumb, index) => <li key={`${crumb.titleKey}-${index}`} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            {index > 0 && <ChevronRight size={13} className="shrink-0 text-gray-400" aria-hidden="true" />}
            {crumb.to ? <Link to={crumb.to} className="truncate text-gray-500 hover:text-gray-900">{t(crumb.titleKey)}</Link> : <span aria-current="page" className="truncate font-medium text-gray-700">{t(crumb.titleKey)}</span>}
          </li>)}
        </ol>
      </nav>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {showOnboardingWarning && <Link to="/b/onboarding" title={t("navbar:links.cta")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 hover:bg-amber-100 md:min-h-0"><AlertTriangle size={15} aria-hidden="true" /><span className="hidden sm:inline">{t("navbar:links.cta")}</span></Link>}
      <NotificationsMenu manageTo="/b/settings/notifications" />
    </div>
  </header>;
}

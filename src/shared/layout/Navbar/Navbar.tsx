import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, BellOff, Menu, AlertTriangle, PanelsTopLeft, ChevronRight } from "lucide-react";
import { useAppShell } from "@/contexts/AppShellContext";
import type { ConfigurationStatus } from "@/models/auth/configuration";
import { getPageBreadcrumbs } from "./pageTitle";

type NavbarProps = { onboarding?: ConfigurationStatus | null; showOnboardingWarning?: boolean };
export default function Navbar({ showOnboardingWarning = false }: NavbarProps) {
  const { t } = useTranslation(["navbar", "settingsSidebar", "accountingSettings"]);
  const { pathname } = useLocation();
  const breadcrumbs = getPageBreadcrumbs(pathname);
  const shell = useAppShell();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const manage = useRef<HTMLAnchorElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => manage.current?.focus());
    const outside = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape, true); };
  }, [open]);
  return <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 sm:px-6" aria-label={t("navbar:header")}>
    <div className="flex min-w-0 items-center gap-3">
      <button type="button" className="rounded-md p-2 text-gray-500 hover:bg-gray-50 md:hidden" onClick={shell?.toggleMobile} aria-label={t("navbar:actions.open")} aria-expanded={shell?.mobileOpen ?? false}><Menu size={18} /></button>
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
      {showOnboardingWarning && <Link to="/onboarding" title={t("navbar:links.cta")} className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 hover:bg-amber-100"><AlertTriangle size={15} /><span className="hidden sm:inline">{t("navbar:links.cta")}</span></Link>}
      <div ref={wrapper} className="relative">
        <button ref={trigger} type="button" onClick={() => setOpen(previous => !previous)} aria-label={t("navbar:notifications.title")} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? "notifications-popover" : undefined} className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"><Bell size={16} /></button>
        {open && <section id="notifications-popover" role="dialog" aria-label={t("navbar:notifications.title")} className="shell-popover absolute right-0 top-11 w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3 text-[13px] font-semibold text-gray-900">{t("navbar:notifications.title")}</div>
          <ul aria-label={t("navbar:notifications.list")} className="max-h-72 overflow-y-auto"><li className="flex flex-col items-center px-6 py-8 text-center"><BellOff size={22} className="mb-3 text-gray-300" /><p className="text-[13px] font-medium text-gray-700">{t("navbar:notifications.empty")}</p><p className="mt-1 text-xs leading-5 text-gray-400">{t("navbar:notifications.description")}</p></li></ul>
          <Link ref={manage} to="/settings/notifications" onClick={() => setOpen(false)} className="block border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-center text-xs font-medium text-gray-600 hover:bg-gray-100">{t("navbar:notifications.manage")}</Link>
        </section>}
      </div>
    </div>
  </header>;
}

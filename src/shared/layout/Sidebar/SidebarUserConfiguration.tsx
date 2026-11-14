import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserRound, Building2, Bell, CircleHelp, LogOut, ChevronsUpDown } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { useAppShell } from "@/contexts/AppShellContext";
import SidebarTooltip from "@/shared/ui/SidebarTooltip";

export default function SidebarUserConfiguration({ collapsed = false, destinations, onNavigate }: { collapsed?: boolean; destinations?: { personal: string; organization?: string; notifications: string; help: string }; onNavigate?(): void }) {
  const { user, handleSignOut } = useAuthContext();
  const shell = useAppShell();
  const { t } = useTranslation("userMenu");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [position, setPosition] = useState({ left: 12, bottom: 72, maxHeight: 400 });
  const initials = (user?.name || "U").trim().split(/\s+/).map(part => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  useEffect(() => setOpen(false), [pathname]);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setPosition({ left: Math.max(12, Math.min(rect.left, innerWidth - 268)), bottom: innerHeight - rect.top + 8, maxHeight: Math.max(120, rect.top - 20) });
    };
    update();
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
      if (event.key === "Tab") setOpen(false);
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      items[next]?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key, true); window.removeEventListener("resize", update); };
  }, [open]);
  const closeForNavigation = () => { setOpen(false); shell?.closeMobile(); onNavigate?.(); };
  const logout = async () => {
    setPending(true); setError(false);
    try { await handleSignOut(); closeForNavigation(); navigate("/signin"); } catch { setError(true); } finally { setPending(false); }
  };
  const links = [
    { to: destinations?.personal || "/settings/personal", key: "personal", Icon: UserRound },
    ...(!destinations || destinations.organization ? [{ to: destinations?.organization || "/settings/organization-settings", key: "organization", Icon: Building2 }] : []),
    { to: destinations?.notifications || "/settings/notifications", key: "notifications", Icon: Bell },
  ];
  return <div className="shrink-0 border-t border-gray-200 p-3">
    <SidebarTooltip label={user?.name || t("account")} collapsed={collapsed}>
      <button ref={trigger} type="button" className="sidebar-row rounded-md text-left hover:bg-gray-200/60" aria-label={t("accountButton", { name: user?.name || t("account") })} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(previous => !previous)}>
        <span className="sidebar-icon flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-700">{initials}</span>
        <span className="sidebar-label flex items-center gap-2 pr-3" aria-hidden={collapsed} style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : undefined }}><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-gray-800">{user?.name || t("account")}</span><span className="block truncate text-[10px] text-gray-500">{user?.email}</span></span><ChevronsUpDown size={13} className="shrink-0 text-gray-400" aria-hidden="true" /></span>
      </button>
    </SidebarTooltip>
    {createPortal(<AnimatePresence initial={false}>{open && <motion.div key="user-configuration-menu" ref={panel} id={id} role="menu" aria-label={t("aria.menu")} initial={{ opacity: 0, y: reducedMotion ? 0 : 4, scale: reducedMotion ? 1 : 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reducedMotion ? 0 : 4, scale: reducedMotion ? 1 : 0.985, pointerEvents: "none" }} transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }} style={{ ...position, transformOrigin: "bottom left" }} className="shell-popover fixed z-[10060] w-64 max-w-[calc(100vw-24px)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg">
      <div className="border-b border-gray-100 px-2.5 py-2"><p className="truncate text-xs font-semibold text-gray-900">{user?.name}</p><p className="mt-0.5 truncate text-[11px] text-gray-500">{user?.email}</p></div>
      {links.map(({ to, key, Icon }) => <Link key={key} to={to} role="menuitem" onClick={closeForNavigation} className="mt-1 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50"><Icon size={15} aria-hidden="true" />{t(`items.${key}`)}</Link>)}
      <button type="button" role="menuitem" onClick={() => { closeForNavigation(); if (destinations) navigate(destinations.help); else shell?.openHelp(); }} className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50"><CircleHelp size={15} aria-hidden="true" />{t("items.help")}</button>
      <div className="my-1 border-t border-gray-100" />
      <button type="button" role="menuitem" disabled={pending} onClick={() => void logout()} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"><LogOut size={15} aria-hidden="true" />{t("items.signout")}</button>
      {error && <p role="alert" className="px-2.5 py-2 text-xs text-red-600">{t("signoutError")}</p>}
    </motion.div>}</AnimatePresence>, document.body)}
  </div>;
}

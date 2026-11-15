import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { EmptyState } from "@/shared/ui/State";

const panelId = "notifications-popover";

/**
 * Bell trigger and animated notifications panel shared by Business and Personal.
 * Motion intentionally matches SidebarUserConfiguration.
 */
export default function NotificationsMenu({ manageTo }: { manageTo: string }) {
  const { t } = useTranslation("navbar");
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const manage = useRef<HTMLAnchorElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => manage.current?.focus());
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(previous => !previous)}
        aria-label={t("notifications.title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 md:h-8 md:w-8"
      >
        <Bell size={16} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && <motion.section
          key={panelId}
          id={panelId}
          role="dialog"
          aria-label={t("notifications.title")}
          initial={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.98, pointerEvents: "none" }}
          transition={{ duration: reduced ? 0 : 0.17, ease: "easeOut" }}
          style={{ transformOrigin: "top right" }}
          className="absolute right-0 top-11 z-[10060] w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-3 text-[13px] font-semibold text-gray-900">{t("notifications.title")}</div>
          <ul aria-label={t("notifications.list")} className="max-h-72 overflow-y-auto">
            <li><EmptyState size="sm" icon={<BellOff size={22} aria-hidden="true" />} title={t("notifications.empty")} description={t("notifications.description")} className="px-6" /></li>
          </ul>
          <Link
            ref={manage}
            to={manageTo}
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-center text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            {t("notifications.manage")}
          </Link>
        </motion.section>}
      </AnimatePresence>
    </div>
  );
}

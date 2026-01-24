/* -------------------------------------------------------------------------- */
/* File: src/components/layout/Sidebar/SidebarSettings.mobile.tsx   (MOBILE)   */
/* -------------------------------------------------------------------------- */

import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  User,
  SlidersHorizontal,
  Bell,
  Shield,
  Building2,
  Users,
  Layers3,
  Landmark,
  CreditCard,
  BookOpen,
  UsersRound,
  Network,
  Boxes,
  FolderKanban,
  IdCard,
  X,
} from "lucide-react";

import { useAuthContext } from "@/hooks/useAuth";

/* -------------------------------- Types ----------------------------------- */
export interface SidebarSettingsProps {
  userName?: string;
  activeItem?: string;
  onSelect?: (id: string) => void;
  topOffsetPx?: number;

  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/* ------------------------------ Lucide Icons ------------------------------ */
const iconClass = "h-4 w-4 flex-shrink-0";

const Icons = {
  user: <User className={iconClass} aria-hidden="true" />,

  // "Personal" / profile settings
  personal: <SlidersHorizontal className={iconClass} aria-hidden="true" />,

  // Notifications / security
  bell: <Bell className={iconClass} aria-hidden="true" />,
  shield: <Shield className={iconClass} aria-hidden="true" />,

  // Organization
  building: <Building2 className={iconClass} aria-hidden="true" />,
  members: <Users className={iconClass} aria-hidden="true" />,
  groups: <UsersRound className={iconClass} aria-hidden="true" />,
  layers: <Layers3 className={iconClass} aria-hidden="true" />,

  // Banking
  bank: <Landmark className={iconClass} aria-hidden="true" />,
  card: <CreditCard className={iconClass} aria-hidden="true" />,

  // Accounting / structure
  ledger: <BookOpen className={iconClass} aria-hidden="true" />,
  departments: <Network className={iconClass} aria-hidden="true" />,

  // Management
  entities: <IdCard className={iconClass} aria-hidden="true" />,
  inventory: <Boxes className={iconClass} aria-hidden="true" />,
  projects: <FolderKanban className={iconClass} aria-hidden="true" />,
} as const;

type IconKey = keyof typeof Icons;
type SidebarItem = { id: string; icon: IconKey; label: string };
type SidebarSection = { title: string; id: string; items: SidebarItem[] };

/* -------------------------------- Component -------------------------------- */
const SidebarSettingsMobile: FC<SidebarSettingsProps> = ({
  userName = "User",
  activeItem,
  onSelect,
  topOffsetPx = 64,
  mobileOpen = false,
  onMobileClose,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { t } = useTranslation("settingsSidebar");

  const displayName = user?.name || userName;

  const sections: SidebarSection[] = useMemo(
    () => [
      {
        title: "",
        id: "me",
        items: [
          { id: "personal", icon: "personal", label: t("items.personal") },
          { id: "notifications", icon: "bell", label: t("items.notifications") },
          { id: "security", icon: "shield", label: t("items.security") },
        ],
      },
      {
        title: t("sections.organization"),
        id: "org",
        items: [
          { id: "organization-settings", icon: "building", label: t("items.organization-settings") },
          { id: "members", icon: "members", label: t("items.members") },
          { id: "groups", icon: "groups", label: t("items.groups") },
          { id: "subscription-management", icon: "layers", label: t("items.subscription-management") },
        ],
      },
      {
        title: t("sections.banking"),
        id: "banking",
        items: [
          { id: "banks", icon: "bank", label: t("items.banks") },
          { id: "bank-statements", icon: "card", label: t("items.bank-statements") },
        ],
      },
      {
        title: t("sections.management"),
        id: "mgmt",
        items: [
          { id: "projects", icon: "projects", label: t("items.projects") },
          { id: "inventory", icon: "inventory", label: t("items.inventory") },
          { id: "entities", icon: "entities", label: t("items.entities") },
        ],
      },
      {
        title: t("sections.accounting"),
        id: "acct",
        items: [
          { id: "ledger-accounts", icon: "ledger", label: t("items.ledger-accounts") },
          { id: "departments", icon: "departments", label: t("items.departments") },
        ],
      },
    ],
    [t]
  );

  const flatItems = useMemo(
    () => sections.flatMap((s) => s.items.map((it) => ({ ...it, sectionId: s.id }))),
    [sections]
  );

  const idxById = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((it, idx) => map.set(it.id, idx));
    return map;
  }, [flatItems]);

  const handleClick = useCallback(
    (id: string) => {
      if (onSelect) onSelect(id);
      else navigate(`/settings/${id}`);
      onMobileClose?.();
    },
    [navigate, onSelect, onMobileClose]
  );

  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    btnRefs.current = Array.from({ length: flatItems.length }, (_, i) => btnRefs.current[i] ?? null);
  }, [flatItems.length]);

  const activeIdx = Math.max(0, idxById.get(activeItem ?? "") ?? 0);
  const [focusIdx, setFocusIdx] = useState<number>(activeIdx);

  useEffect(() => {
    setFocusIdx(activeIdx);
    const btn = btnRefs.current[activeIdx];
    requestAnimationFrame(() => btn?.scrollIntoView({ block: "nearest" }));
  }, [activeIdx]);

  useEffect(() => {
    if (mobileOpen) listRef.current?.focus({ preventScroll: true });
  }, [mobileOpen]);

  const onEsc = useCallback(() => {
    onMobileClose?.();
  }, [onMobileClose]);

  window.useGlobalEsc(!!mobileOpen, onEsc);

  const bodyOverflowRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mobileOpen) {
      if (bodyOverflowRef.current != null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
      return;
    }

    if (bodyOverflowRef.current == null) bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (bodyOverflowRef.current != null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
    };
  }, [mobileOpen]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(e.key)) return;
    e.preventDefault();

    const last = flatItems.length - 1;

    if (e.key === "ArrowDown") setFocusIdx((n) => Math.min(n + 1, last));
    if (e.key === "ArrowUp") setFocusIdx((n) => Math.max(n - 1, 0));
    if (e.key === "Home") setFocusIdx(0);
    if (e.key === "End") setFocusIdx(last);

    if (e.key === "Enter" || e.key === " ") {
      const item = flatItems[focusIdx];
      if (item) handleClick(item.id);
    }
  };

  useEffect(() => {
    const el = btnRefs.current[focusIdx];
    el?.focus({ preventScroll: true });
    requestAnimationFrame(() => el?.scrollIntoView({ block: "nearest" }));
  }, [focusIdx]);

  const drawerTranslateClass = mobileOpen ? "translate-x-0" : "-translate-x-full";
  const pointerEventsClass = mobileOpen ? "pointer-events-auto" : "pointer-events-none";

  return (
    <>
      {/* Overlay */}
      <div
        className={[
          "md:hidden fixed left-0 right-0 bottom-0 z-30",
          "bg-black/40 backdrop-blur-sm",
          "transition-opacity duration-200",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        style={{ top: topOffsetPx }}
        aria-hidden="true"
        onClick={() => onMobileClose?.()}
      />

      <nav
        aria-label={t("aria.nav")}
        className={[
          "md:hidden fixed left-0 z-40 border-r border-gray-200 bg-white",
          "w-72 max-w-[85vw]",
          "transform transition-transform duration-200 ease-out",
          drawerTranslateClass,
          pointerEventsClass,
          "flex flex-col",
        ].join(" ")}
        style={{ top: topOffsetPx, height: `calc(100vh - ${topOffsetPx}px)` }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-500">{Icons.user}</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{displayName}</span>
          </div>

          <button
            type="button"
            onClick={() => onMobileClose?.()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label={t("actions.close", { defaultValue: "Close" })}
            title={t("actions.close", { defaultValue: "Close" })}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scroll region */}
        <div
          ref={listRef}
          className={["min-h-0 flex-1 overflow-y-auto outline-none overscroll-contain", "pt-2 pb-12"].join(" ")}
          tabIndex={0}
          onKeyDown={onKeyDown}
          role="menu"
          aria-orientation="vertical"
          style={{ scrollPaddingTop: 12, scrollPaddingBottom: 48 }}
        >
          <div className="mt-1 space-y-4">
            {sections.map(({ title, id: sectionId, items }) => (
              <section key={sectionId} aria-label={title || "Profile"}>
                {title ? (
                  <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {title}
                  </p>
                ) : null}

                <ul className="space-y-0.5 px-2">
                  {items.map(({ id, icon, label }) => {
                    const active = activeItem === id;
                    const idx = idxById.get(id) ?? 0;

                    return (
                      <li key={id}>
                        <button
                          ref={(el) => {
                            btnRefs.current[idx] = el;
                          }}
                          type="button"
                          role="menuitem"
                          aria-current={active ? "page" : undefined}
                          onClick={() => handleClick(id)}
                          tabIndex={focusIdx === idx ? 0 : -1}
                          className={[
                            "group w-full flex items-center gap-3 h-9 rounded-md px-3",
                            "transition-colors outline-none",
                            "scroll-mt-3 scroll-mb-3",
                            active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50",
                          ].join(" ")}
                          title={label}
                        >
                          <span
                            className={[
                              "flex items-center justify-center rounded",
                              active ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            {Icons[icon]}
                          </span>

                          <span className="text-sm truncate">{label}</span>

                          <span
                            aria-hidden="true"
                            className={[
                              "ml-auto h-4 w-0.5 rounded-full",
                              active ? "bg-gray-400/70" : "bg-transparent",
                            ].join(" ")}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
};

export default SidebarSettingsMobile;

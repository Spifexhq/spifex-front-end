/* -------------------------------------------------------------------------- */
/* File: src/components/layout/Sidebar/SidebarSettings.desktop.tsx  (DESKTOP)  */
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
} from "lucide-react";

import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "@/middlewares";

/* -------------------------------- Types ----------------------------------- */
export interface SidebarSettingsProps {
  userName?: string;
  activeItem?: string;
  onSelect?: (id: string) => void;
  topOffsetPx?: number;

  // Ignored on desktop (kept for prop-compat)
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
type SidebarItem = { id: string; icon: IconKey; label: string; permission: string };
type SidebarSection = { title: string; id: string; items: SidebarItem[] };

/* ------------------------------ Component --------------------------------- */
const SidebarSettingsDesktop: FC<SidebarSettingsProps> = ({
  userName = "User",
  activeItem,
  onSelect,
  topOffsetPx = 64,
}) => {
  const navigate = useNavigate();
  const { user, permissions } = useAuthContext();
  const { t } = useTranslation("settingsSidebar");

  const displayName = user?.name || userName;

  const sections: SidebarSection[] = useMemo(
    () => [
      {
        title: "",
        id: "me",
        items: [
          { id: "personal", icon: "personal", label: t("items.personal"), permission: "view_personal_settings_page" },
          { id: "notifications", icon: "bell", label: t("items.notifications"), permission: "view_notification_settings_page" },
          { id: "security", icon: "shield", label: t("items.security"), permission: "view_security_and_privacy_page" },
        ],
      },
      {
        title: t("sections.organization"),
        id: "org",
        items: [
          { id: "organization-settings", icon: "building", label: t("items.organization-settings"), permission: "view_organization_settings_page" },
          { id: "members", icon: "members", label: t("items.members"), permission: "view_member_settings_page" },
          { id: "groups", icon: "groups", label: t("items.groups"), permission: "view_group_settings_page" },
          { id: "subscription-management", icon: "layers", label: t("items.subscription-management"), permission: "view_subscription_management_page" },
        ],
      },
      {
        title: t("sections.banking"),
        id: "banking",
        items: [
          { id: "banks", icon: "bank", label: t("items.banks"), permission: "view_bank_settings_page" },
          { id: "bank-statements", icon: "card", label: t("items.bank-statements"), permission: "view_statements_page" },
        ],
      },
      {
        title: t("sections.management"),
        id: "mgmt",
        items: [
          { id: "projects", icon: "projects", label: t("items.projects"), permission: "view_project_settings_page" },
          { id: "inventory", icon: "inventory", label: t("items.inventory"), permission: "view_inventory_settings_page" },
          { id: "entities", icon: "entities", label: t("items.entities"), permission: "view_entity_settings_page" },
        ],
      },
      {
        title: t("sections.accounting"),
        id: "acct",
        items: [
          { id: "ledger-accounts", icon: "ledger", label: t("items.ledger-accounts"), permission: "view_ledger_accounts_page" },
          { id: "departments", icon: "departments", label: t("items.departments"), permission: "view_department_settings_page" },
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
    },
    [navigate, onSelect]
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

  return (
    <nav
      aria-label={t("aria.nav")}
      className={[
        "hidden md:flex fixed left-0 z-40 border-r border-gray-200 bg-white",
        "w-64",
        "flex flex-col",
      ].join(" ")}
      style={{ top: topOffsetPx, height: `calc(100vh - ${topOffsetPx}px)` }}
    >
      {/* Desktop header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{Icons.user}</span>
          <span className="text-sm font-semibold text-gray-800">{displayName}</span>
        </div>
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
          {sections.map(({ title, id: sectionId, items }) => {
            const visibleItems = items.filter(item => permissions.includes(item.permission));

            return (
              visibleItems.length > 0 && (
                <section key={sectionId} aria-label={title || "Profile"}>
                  {title && (
                    <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {title}
                    </p>
                  )}

                  <ul className="space-y-0.5 px-2">
                    {visibleItems.map(({ id, icon, label, permission }) => (
                      <li key={id}>
                        <PermissionMiddleware codeName={permission}>
                          <button
                            ref={(el) => {
                              btnRefs.current[idxById.get(id) ?? 0] = el;
                            }}
                            type="button"
                            role="menuitem"
                            aria-current={activeItem === id ? "page" : undefined}
                            onClick={() => handleClick(id)}
                            tabIndex={focusIdx === idxById.get(id) ? 0 : -1}
                            className={[
                              "group w-full flex items-center gap-3 h-9 rounded-md px-3",
                              activeItem === id ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50",
                            ].join(" ")}
                            title={label}
                          >
                            <span className="flex items-center justify-center rounded" aria-hidden="true">
                              {Icons[icon]}
                            </span>
                            <span className="text-sm truncate">{label}</span>
                            <span
                              aria-hidden="true"
                              className={[
                                "ml-auto h-4 w-0.5 rounded-full",
                                activeItem === id ? "bg-gray-400/70" : "bg-transparent",
                              ].join(" ")}
                            />
                          </button>
                        </PermissionMiddleware>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default SidebarSettingsDesktop;

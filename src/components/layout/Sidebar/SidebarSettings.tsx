import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth as useAuthHook } from "@/api/auth";
import { useTranslation } from "react-i18next";

/* -------------------------------- Types ----------------------------------- */
export interface SidebarSettingsProps {
  userName?: string;
  activeItem?: string;
  onSelect?: (id: string) => void;
  topOffsetPx?: number;
}

/* ------------------------------ Inline SVGs ------------------------------ */
const svg = (path: string, viewBox = "0 0 24 24") => (
  <svg
    className="w-4 h-4 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox={viewBox}
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const Icons = {
  user: svg("M12 12a5 5 0 100-10 5 5 0 000 10z M4 20v-1a7 7 0 017-7h2a7 7 0 017 7v1"),
  personal: svg("M4 6h16M9 4a2 2 0 110 4M4 12h16M15 10a2 2 0 110 4M4 18h16M7 16a2 2 0 110 4"),
  bell: svg("M18 16v-4a6 6 0 10-12 0v4l-2 2h16l-2-2z M13.73 21a2 2 0 01-3.46 0"),
  robot: svg("M4 7h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z M9 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z M12 7V4m0-1a1 1 0 110 2 1 1 0 010-2z"),
  shield: svg("M12 3l7 3v6c0 4.5-3 8.5-7 9-4-.5-7-4.5-7-9V6l7-3z M9 12h6M12 9v6"),
  building: svg("M6 4h12v16H6V4z M10 8h1M13 8h1M10 11h1M13 11h1M10 14h1M13 14h1M8 20v-2h8v2"),
  employees: svg("M8 8a3 3 0 110-6 3 3 0 010 6z M16 9a3 3 0 110-6 3 3 0 010 6z M4 19v-1a5 5 0 015-5h0 M12 19v-1a5 5 0 015-5h0"),
  layers: svg("M12 3l9 5-9 5-9-5 9-5z M21 13l-9 5-9-5"),
  integrations: svg("M3 7h8v8H3V7z M13 9h8v8h-8V9z M11 11h2v2h-2z"),
  bank: svg("M3 9l9-5 9 5z M4 10h16 M6 10v7M10 10v7M14 10v7M18 10v7 M3 17h18M2 21h20"),
  card: svg("M3 5h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z M3 10h18 M7 15h5"),
  receipt: svg("M7 3h10v18l-3-2-2 2-2-2-3 2V3z M9 7h6M9 11h6M9 15h4"),
  assistant: svg("M3 21l8-8 M12 4l6 6-6 6-6-6 6-6z M18 3v2 M21 6h-2 M17 11v2 M12 6h2"),
  ledger: svg("M5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 7h11 M5 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 12h11 M5 17a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 17h11"),
  groups: svg("M6 12a2 2 0 110-4 2 2 0 010 4z M18 7a2 2 0 110-4 2 2 0 010 4z M18 17a2 2 0 110-4 2 2 0 010 4z M8 12h6 M16 8l-4 3 M16 16l-4-3"),
  departments: svg("M4 4h7v7H4V4z M13 4h7v7h-7V4z M4 13h7v7H4v-7z M13 13h7v7h-7v-7z"),
  entities: svg("M4 6h7v14H4V6z M13 4h7v16h-7V4z M7 9h1M7 12h1M7 15h1M16 8h1M16 11h1M16 14h1 M6 20h3M15 20h5"),
  inventory: svg("M12 3l9 5-9 5-9-5 9-5z M21 8v8l-9 5-9-5V8 M12 13v8"),
  projects: svg("M9 6V4h6v2 M3 7h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M3 12h18"),
} as const;
type IconKey = keyof typeof Icons;

/* ------------------------------ Component ---------------------------------- */
const SidebarSettings: React.FC<SidebarSettingsProps> = ({
  userName = "User",
  activeItem,
  onSelect,
  topOffsetPx = 64,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthHook();
  const { t } = useTranslation(["settings"]);
  const displayName = user?.name || userName;

  const sections = useMemo(
    () => [
      {
        title: "",
        id: "me",
        items: [
          { id: "personal", icon: "personal" as IconKey, label: t("sidebar.items.personal") },
          { id: "notifications", icon: "bell" as IconKey, label: t("sidebar.items.notifications") },
          { id: "security", icon: "shield" as IconKey, label: t("sidebar.items.security") },
        ],
      },
      {
        title: t("sidebar.sections.organization"),
        id: "org",
        items: [
          { id: "company-settings", icon: "building" as IconKey, label: t("sidebar.items.company-settings") },
          { id: "employees", icon: "employees" as IconKey, label: t("sidebar.items.employees") },
          { id: "groups", icon: "groups" as IconKey, label: t("sidebar.items.groups") },
          { id: "subscription-management", icon: "layers" as IconKey, label: t("sidebar.items.subscription-management") },
        ],
      },
      {
        title: t("sidebar.sections.banking"),
        id: "banking",
        items: [
          { id: "banks", icon: "bank" as IconKey, label: t("sidebar.items.banks") },
          { id: "bank-statements", icon: "card" as IconKey, label: t("sidebar.items.bank-statements") },
          // { id: "expenses", icon: "receipt" as IconKey, label: t("sidebar.items.expenses") },
        ],
      },
      {
        title: t("sidebar.sections.management"),
        id: "mgmt",
        items: [
          { id: "projects", icon: "projects" as IconKey, label: t("sidebar.items.projects") },
          { id: "inventory", icon: "inventory" as IconKey, label: t("sidebar.items.inventory") },
          { id: "entities", icon: "entities" as IconKey, label: t("sidebar.items.entities") },
        ],
      },
      {
        title: t("sidebar.sections.accounting"),
        id: "acct",
        items: [
          { id: "ledger-accounts", icon: "ledger" as IconKey, label: t("sidebar.items.ledger-accounts") },
          { id: "departments", icon: "departments" as IconKey, label: t("sidebar.items.departments") },
        ],
      },
    ],
    [t]
  );

  /* ------------------------- navigation / selection ------------------------ */
  const handleClick = useCallback(
    (id: string) => {
      if (onSelect) {
        onSelect(id);
      } else {
        navigate(`/settings/${id}`);
      }
    },
    [navigate, onSelect]
  );

  /* ------------------------------- keyboard nav ---------------------------- */
  const listRef = useRef<HTMLDivElement>(null);
  const flatItems = useMemo(
    () => sections.flatMap((s) => s.items.map((it) => ({ ...it, sectionId: s.id }))),
    [sections]
  );
  const activeIdx = Math.max(
    0,
    flatItems.findIndex((i) => i.id === activeItem)
  );

  const [focusIdx, setFocusIdx] = useState<number>(activeIdx >= 0 ? activeIdx : 0);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setFocusIdx(activeIdx >= 0 ? activeIdx : 0);
    const btn = btnRefs.current[activeIdx];
    btn?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(e.key)) {
      e.preventDefault();
    } else {
      return;
    }

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
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIdx]);

  /* ------------------------------- UI helpers ------------------------------ */
  // minimal scroll shadows using mask-image so no extra DOM
  const maskStyle: React.CSSProperties = {
    WebkitMaskImage:
      "linear-gradient(to bottom, rgba(0,0,0,0.0) 0, rgba(0,0,0,1) 12px, rgba(0,0,0,1) calc(100% - 12px), rgba(0,0,0,0.0) 100%)",
    maskImage:
      "linear-gradient(to bottom, rgba(0,0,0,0.0) 0, rgba(0,0,0,1) 12px, rgba(0,0,0,1) calc(100% - 12px), rgba(0,0,0,0.0) 100%)",
  };

  return (
    <nav
      aria-label={t("sidebar.aria.nav")}
      className="fixed left-0 z-40 w-64 border-r border-gray-200 bg-white"
      style={{
        top: topOffsetPx,
        height: `calc(100vh - ${topOffsetPx}px)`,
      }}
    >
      {/* Scroll area */}
      <div
        ref={listRef}
        className="h-full overflow-y-auto py-2 outline-none"
        style={maskStyle}
        tabIndex={0}
        onKeyDown={onKeyDown}
        role="menu"
        aria-orientation="vertical"
      >
        {/* User header */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{Icons.user}</span>
            <span className="text-sm font-semibold text-gray-800">{displayName}</span>
          </div>
        </div>

        {/* Sections */}
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
                  const idx = flatItems.findIndex((i) => i.id === id);
                  return (
                    <li key={id}>
                      <button
                        ref={(el) => (btnRefs.current[idx] = el)}
                        type="button"
                        role="menuitem"
                        aria-current={active ? "page" : undefined}
                        onClick={() => handleClick(id)}
                        tabIndex={focusIdx === idx ? 0 : -1}
                        className={[
                          "group w-full flex items-center gap-3 h-9 rounded-md px-3",
                          "transition-colors outline-none",
                          active
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50",
                        ].join(" ")}
                        data-active={active ? "true" : undefined}
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

                        {/* active indicator rail (subtle) */}
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
  );
};

export default SidebarSettings;

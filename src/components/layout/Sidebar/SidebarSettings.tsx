// src/components/layout/Sidebar/SidebarSettings.tsx
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
import { useAuthContext } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

/* -------------------------------- Types ----------------------------------- */
export interface SidebarSettingsProps {
  userName?: string;
  activeItem?: string;
  onSelect?: (id: string) => void;
  topOffsetPx?: number;

  // Responsive drawer controls (controlled by layout)
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/* ------------------------------ Inline SVGs ------------------------------ */
const svg = (path: string, viewBox = "0 0 24 24") => (
  <svg
    className="h-4 w-4 flex-shrink-0"
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
  shield: svg("M12 3l7 3v6c0 4.5-3 8.5-7 9-4-.5-7-4.5-7-9V6l7-3z M9 12h6M12 9v6"),
  building: svg("M6 4h12v16H6V4z M10 8h1M13 8h1M10 11h1M13 11h1M10 14h1M13 14h1M8 20v-2h8v2"),
  members: svg("M8 8a3 3 0 110-6 3 3 0 010 6z M16 9a3 3 0 110-6 3 3 0 010 6z M4 19v-1a5 5 0 015-5h0 M12 19v-1a5 5 0 015-5h0"),
  layers: svg("M12 3l9 5-9 5-9-5 9-5z M21 13l-9 5-9-5"),
  bank: svg("M3 9l9-5 9 5z M4 10h16 M6 10v7M10 10v7M14 10v7M18 10v7 M3 17h18M2 21h20"),
  card: svg("M3 5h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z M3 10h18 M7 15h5"),
  receipt: svg("M7 3h10v18l-3-2-2 2-2-2-3 2V3z M9 7h6M9 11h6M9 15h4"),
  ledger: svg("M5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 7h11 M5 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 12h11 M5 17a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 17h11"),
  groups: svg("M6 12a2 2 0 110-4 2 2 0 010 4z M18 7a2 2 0 110-4 2 2 0 010 4z M18 17a2 2 0 110-4 2 2 0 010 4z M8 12h6 M16 8l-4 3 M16 16l-4-3"),
  departments: svg("M4 4h7v7H4V4z M13 4h7v7h-7V4z M4 13h7v7H4v-7z M13 13h7v7h-7v-7z"),
  entities: svg("M4 6h7v14H4V6z M13 4h7v16h-7V4z M7 9h1M7 12h1M7 15h1M16 8h1M16 11h1M16 14h1 M6 20h3M15 20h5"),
  inventory: svg("M12 3l9 5-9 5-9-5 9-5z M21 8v8l-9 5-9-5V8 M12 13v8"),
  projects: svg("M9 6V4h6v2 M3 7h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M3 12h18"),
} as const;

type IconKey = keyof typeof Icons;

type SidebarItem = { id: string; icon: IconKey; label: string };
type SidebarSection = { title: string; id: string; items: SidebarItem[] };

const SidebarSettings: FC<SidebarSettingsProps> = ({
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

  // keep refs array aligned with item count
  useEffect(() => {
    btnRefs.current = Array.from({ length: flatItems.length }, (_, i) => btnRefs.current[i] ?? null);
  }, [flatItems.length]);

  const activeIdx = Math.max(0, idxById.get(activeItem ?? "") ?? 0);
  const [focusIdx, setFocusIdx] = useState<number>(activeIdx);

  // update focus when active changes, ensure active button is visible
  useEffect(() => {
    setFocusIdx(activeIdx);
    const btn = btnRefs.current[activeIdx];
    // Use requestAnimationFrame to avoid scrollIntoView before layout settles
    requestAnimationFrame(() => {
      btn?.scrollIntoView({ block: "nearest" });
    });
  }, [activeIdx]);

  // Close drawer on ESC (DOM event)
  useEffect(() => {
    if (!mobileOpen) return;

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  // When drawer opens, focus the scroll container
  useEffect(() => {
    if (mobileOpen) listRef.current?.focus({ preventScroll: true });
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

  // Follow focus index with actual focus + visibility
  useEffect(() => {
    const el = btnRefs.current[focusIdx];
    el?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      el?.scrollIntoView({ block: "nearest" });
    });
  }, [focusIdx]);

  const drawerTranslateClass = mobileOpen ? "translate-x-0" : "-translate-x-full";
  const pointerEventsClass = mobileOpen ? "pointer-events-auto" : "pointer-events-none";

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={[
          "md:hidden fixed left-0 right-0 bottom-0 z-30 bg-black/30",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          "transition-opacity",
        ].join(" ")}
        style={{ top: topOffsetPx }}
        aria-hidden="true"
        onClick={() => onMobileClose?.()}
      />

      <nav
        aria-label={t("aria.nav")}
        className={[
          "fixed left-0 z-40 border-r border-gray-200 bg-white",
          "w-72 max-w-[85vw] md:w-64",
          "transform transition-transform duration-200 ease-out",
          `md:translate-x-0 ${drawerTranslateClass}`,
          `md:pointer-events-auto ${pointerEventsClass}`,
          // CRITICAL: flex column so header consumes space and list becomes the scroll region
          "flex flex-col",
        ].join(" ")}
        style={{ top: topOffsetPx, height: `calc(100vh - ${topOffsetPx}px)` }}
      >
        {/* Mobile header (shrink-0) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-500">{Icons.user}</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{displayName}</span>
          </div>

          <button
            type="button"
            onClick={() => onMobileClose?.()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Close settings navigation"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        {/* Desktop header (shrink-0) */}
        <div className="hidden md:block px-4 pt-3 pb-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{Icons.user}</span>
            <span className="text-sm font-semibold text-gray-800">{displayName}</span>
          </div>
        </div>

        {/* Scroll region (flex-1 + min-h-0 is the fix) */}
        <div
          ref={listRef}
          className={[
            "min-h-0 flex-1 overflow-y-auto outline-none overscroll-contain",
            "pt-2 pb-12", // extra bottom space so Departments is never clipped
          ].join(" ")}
          tabIndex={0}
          onKeyDown={onKeyDown}
          role="menu"
          aria-orientation="vertical"
          // Ensures scrollIntoView never tucks items under top/bottom edges
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
                            // Keep focused/active rows from landing partially hidden
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

export default SidebarSettings;

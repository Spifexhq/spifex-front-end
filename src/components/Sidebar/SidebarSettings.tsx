import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth as useAuthHook } from "@/api/auth";

/**
 * ## SidebarSettings
 * A **simple, always‑visible** settings sidebar in a light theme. It does **not**
 * rely on `isOpen`/collapse logic and avoids external icon libraries by using
 * inline SVGs. Structure and labels follow the screenshot you provided.
 */

export interface SidebarSettingsProps {
  /** Name shown at the very top; defaults to "User". */
  userName?: string;
  /** ID of the currently selected item – for highlighting (optional). */
  activeItem?: string;
  /** Called when a menu item is clicked (optional). */
  onSelect?: (id: string) => void;
}

/* -------------------------------------------------------------------------- */
/*                              Inline SVG icons                              */
/* -------------------------------------------------------------------------- */

const svg = (path: string, viewBox = "0 0 24 24") => (
  <svg
    className="w-4 h-4 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox={viewBox}
  >
    <path d={path} />
  </svg>
);

const Icons = {
  user: svg(
    "M12 12a5 5 0 100-10 5 5 0 000 10z M4 20v-1a7 7 0 017-7h2a7 7 0 017 7v1",
  ),
  personal: svg(
    "M4 6h16M9 4a2 2 0 110 4M4 12h16M15 10a2 2 0 110 4M4 18h16M7 16a2 2 0 110 4"
  ),
  bell: svg(
    "M18 16v-4a6 6 0 10-12 0v4l-2 2h16l-2-2z M13.73 21a2 2 0 01-3.46 0"
  ),
  robot: svg(
    "M4 7h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z M9 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z M12 7V4m0-1a1 1 0 110 2 1 1 0 010-2z"
  ),
  shield: svg(
    "M12 3l7 3v6c0 4.5-3 8.5-7 9-4-.5-7-4.5-7-9V6l7-3z M9 12h6M12 9v6"
  ),
  building: svg(
    "M6 4h12v16H6V4z M10 8h1M13 8h1M10 11h1M13 11h1M10 14h1M13 14h1M8 20v-2h8v2"
  ),
  employees: svg(
    "M8 8a3 3 0 110-6 3 3 0 010 6z M16 9a3 3 0 110-6 3 3 0 010 6z M4 19v-1a5 5 0 015-5h0 M12 19v-1a5 5 0 015-5h0"
  ),
  layers: svg(
    "M12 3l9 5-9 5-9-5 9-5z M21 13l-9 5-9-5"
  ),
  integrations: svg(
    "M3 7h8v8H3V7z M13 9h8v8h-8V9z M11 11h2v2h-2z"
  ),
  bank: svg(
    "M3 9l9-5 9 5z M4 10h16 M6 10v7M10 10v7M14 10v7M18 10v7 M3 17h18M2 21h20"
  ),
  card: svg(
    "M3 5h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z M3 10h18 M7 15h5"
  ),
  receipt: svg(
    "M7 3h10v18l-3-2-2 2-2-2-3 2V3z M9 7h6M9 11h6M9 15h4"
  ),
  assistant: svg(
    "M3 21l8-8 M12 4l6 6-6 6-6-6 6-6z M18 3v2 M21 6h-2 M17 11v2 M12 6h2"
  ),
  ledger: svg(
    "M5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 7h11 M5 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 12h11 M5 17a1.5 1.5 0 110-3 1.5 1.5 0 010 3z M9 17h11"
  ),
  groups: svg(
    "M6 12a2 2 0 110-4 2 2 0 010 4z M18 7a2 2 0 110-4 2 2 0 010 4z M18 17a2 2 0 110-4 2 2 0 010 4z M8 12h6 M16 8l-4 3 M16 16l-4-3"
  ),
  departments: svg(
    "M4 4h7v7H4V4z M13 4h7v7h-7V4z M4 13h7v7H4v-7z M13 13h7v7h-7v-7z"
  ),
  entities: svg(
    "M4 6h7v14H4V6z M13 4h7v16h-7V4z M7 9h1M7 12h1M7 15h1M16 8h1M16 11h1M16 14h1 M6 20h3M15 20h5"
  ),
  inventory: svg(
    "M12 3l9 5-9 5-9-5 9-5z M21 8v8l-9 5-9-5V8 M12 13v8"
  ),
  projects: svg(
    "M9 6V4h6v2 M3 7h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7z M3 12h18"
  ),
};

/* -------------------------------------------------------------------------- */
/*                              Menu definition                               */
/* -------------------------------------------------------------------------- */

const sections: {
  title: string;
  items: { id: string; icon: keyof typeof Icons; label: string }[];
}[] = [
  {
    title: "",
    items: [
      { id: "personal", icon: "personal", label: "Personal settings" },
      { id: "notifications", icon: "bell", label: "Notifications" },
      { id: "copilots", icon: "robot", label: "Copilots" },
      { id: "security", icon: "shield", label: "Security and privacy" },
    ],
  },
  {
    title: "Organization",
    items: [
      { id: "company-settings", icon: "building", label: "Company settings" },
      { id: "employees", icon: "employees", label: "Employees" },
      { id: "groups", icon: "groups", label: "Groups" },
      { id: "subscription-management", icon: "layers", label: "Plan" },
      { id: "integrations", icon: "integrations", label: "Integrations" },
    ],
  },
  {
    title: "Banking",
    items: [
      { id: "banks", icon: "bank", label: "Banks" },
      { id: "bank-statements", icon: "card", label: "Statements" },
      { id: "expenses", icon: "receipt", label: "Expenses" },
    ],
  },
  {
    title: "Management",
    items: [
      { id: "assistant", icon: "assistant", label: "Assistant" },
      { id: "projects", icon: "projects", label: "Projects" },
      { id: "inventory", icon: "inventory", label: "Inventory" },
      { id: "entities", icon: "inventory", label: "Entities" },
    ],
  },
  {
    title: "Accounting & Structure",
    items: [
      { id: "ledger-accounts", icon: "ledger", label: "Ledger Accounts" },
      { id: "departments", icon: "departments", label: "Departments" },
      { id: "entities", icon: "entities", label: "Entities" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                              Component markup                              */
/* -------------------------------------------------------------------------- */

const SidebarSettings: React.FC<SidebarSettingsProps> = ({
  userName = "User",
  activeItem,
  onSelect,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthHook();
  const displayName = user?.name || userName;

  const handleClick = (id: string) => {
    if (onSelect) onSelect(id);
    else navigate(`/settings/${id}`);
  };

  return (
    <nav
      aria-label="Settings navigation sidebar"
      className="fixed top-12 left-0 h-screen w-64 z-50 flex flex-col bg-white border-r border-gray-200"
    >
      <div className="flex-1 overflow-y-auto py-3">
        {sections.map(({ title, items }, idx) => {
          const isUserSection = title === "" && idx === 0;

          return (
            <div key={title || "root"} className="mt-1">
              {isUserSection ? (
                <div className="px-4 pt-4 pb-1 text-xs uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{Icons.user}</span>
                    <span className="font-semibold text-gray-700 normal-case text-sm">
                      {displayName}
                    </span>
                  </div>
                </div>
              ) : (
                title && (
                  <p className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {title}
                  </p>
                )
              )}

              <ul className="space-y-1">
                {items.map(({ id, icon, label }) => {
                  const active = activeItem === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => handleClick(id)}
                        className={`group w-full flex items-center gap-3 h-9 rounded-lg px-3 transition-colors duration-200 ${
                          active
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {Icons[icon]}
                        <span className="text-sm whitespace-nowrap">
                          {label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default SidebarSettings;

import React from "react";

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
  user: (
    <svg
      className="w-5 h-5 text-gray-600 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0Z" />
      <path d="M4.5 21a8.25 8.25 0 0115 0" />
    </svg>
  ),
  settings: svg(
    "M11.982 3.5a8.45 8.45 0 00-2.474.372 1 1 0 01-.98-.196l-1.625-1.4a.75.75 0 00-1.025.134l-1.6 1.9a.75.75 0 00.109 1.045l1.384 1.147a1 1 0 01.376.881 8.48 8.48 0 000 2.558 1 1 0 01-.376.881L4.387 11.7a.75.75 0 00-.109 1.045l1.6 1.9a.75.75 0 001.025.134l1.625-1.4a1 1 0 01.98-.196 8.45 8.45 0 004.948 0 1 1 0 01.98.196l1.625 1.4a.75.75 0 001.025-.134l1.6-1.9a.75.75 0 00-.109-1.045l-1.384-1.147a1 1 0 01-.376-.881 8.479 8.479 0 01.002-2.558 1 1 0 01.376-.881l1.384-1.147a.75.75 0 00.109-1.045l-1.6-1.9a.75.75 0 00-1.025-.134l-1.625 1.4a1 1 0 01-.98.196 8.45 8.45 0 00-2.474-.372ZM15 12a3 3 0 11-6 0 3 3 0 016 0Z"
  ),
  bell: svg(
    "M14.857 17.243A5.642 5.642 0 0112 18.5a5.642 5.642 0 01-2.857-.257M18 10.5a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
  ),
  robot: svg(
    "M10 3h4v2h3a1 1 0 011 1v3h2v7H4V9h2V6a1 1 0 011-1h3V3Zm-3 10h2v2H7v-2Zm8 0h2v2h-2v-2ZM9 6h6v2H9V6Z"
  ),
  shield: svg(
    "M12 22.09l-.97-.44C6 19.07 3 15.86 3 12V5l9-4 9 4v7c0 3.86-3 7.07-8.03 9.65l-.97.44Z M9 12l2 2 4-4"
  ),
  building: svg("M4 21h16V7L12 3 4 7v14ZM9 21V9h6v12"),
  layers: svg("M3 7l9-4 9 4-9 4-9-4ZM3 14l9 4 9-4M3 10l9 4 9-4"),
  squares: svg("M3 3h7v7H3V3Zm0 11h7v7H3v-7Zm11-11h7v7h-7V3Zm0 11h7v7h-7v-7Z"),
  card: svg(
    "M2.25 7.5h19.5v-3A2.25 2.25 0 0019.5 2.25H4.5A2.25 2.25 0 002.25 4.5v3ZM2.25 9h19.5v8.25A2.25 2.25 0 0119.5 19.5H4.5a2.25 2.25 0 01-2.25-2.25V9Zm15 4.5h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z"
  ),
  receipt: svg(
    "M9 3.75 7.5 2.25 6 3.75 4.5 2.25 3 3.75v16.5l1.5-1.5 1.5 1.5 1.5-1.5 1.5 1.5 1.5-1.5 1.5 1.5V3.75L10.5 2.25 9 3.75ZM9 7.5h6m-6 3h6m-6 3h3"
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
      { id: "personal-settings", icon: "settings", label: "Personal settings" },
      { id: "notifications", icon: "bell", label: "Notifications" },
      { id: "copilots", icon: "robot", label: "Copilots" },
      { id: "security", icon: "shield", label: "Security and privacy" },
    ],
  },
  {
    title: "My own",
    items: [
      { id: "company-settings", icon: "building", label: "Company settings" },
      { id: "plan", icon: "layers", label: "Plan" },
      { id: "integrations", icon: "squares", label: "Integrations" },
    ],
  },
  {
    title: "Banking",
    items: [{ id: "bank-statements", icon: "card", label: "Bank statements" }],
  },
  {
    title: "Spend management",
    items: [
      { id: "expenses", icon: "receipt", label: "Expenses" },
      { id: "brex-assistant", icon: "robot", label: "Brex Assistant" },
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
}) => (
  <nav
    aria-label="Settings navigation sidebar"
    className="fixed top-0 left-0 h-screen w-64 z-50 flex flex-col bg-white border-r border-gray-200"
  >
    {/* User block */}
    <div className="flex items-center gap-2 h-16 px-3 border-b border-gray-100 select-none">
      {Icons.user}
      <span className="font-medium text-gray-700">{userName}</span>
    </div>

    {/* Menu groups */}
    <div className="flex-1 overflow-y-auto py-3">
      {sections.map(({ title, items }) => (
        <div key={title || "root"} className="mt-1">
          {title && (
            <p className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {title}
            </p>
          )}

          <ul className="space-y-1">
            {items.map(({ id, icon, label }) => {
              const active = activeItem === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(id)}
                    className={`group w-full flex items-center gap-3 h-9 rounded-lg px-3 transition-colors duration-200 ${
                      active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {Icons[icon]}
                    <span className="text-sm whitespace-nowrap">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  </nav>
);

export default SidebarSettings;

// src/components/Navbar.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PermissionMiddleware } from "@/middlewares";
import { useAuthContext } from "@/hooks/useAuth";

import UserMenu from "@/components/UserMenu";
import SimulatedAI from "@/components/SimulatedAI";

/* -------------------------------- Helpers -------------------------------- */
function useMediaQuery(query: string): boolean {
  const getMatch = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    setMatches(mql.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }

    // Legacy fallback
    const legacy = mql as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };

    legacy.addListener?.(handler);
    return () => legacy.removeListener?.(handler);
  }, [query]);

  return matches;
}

const Navbar: React.FC = () => {
  const { t } = useTranslation("navbar");

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSimulatedAIOpen, setIsSimulatedAIOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const location = useLocation();
  const { isSuperUser, isSubscribed } = useAuthContext();

  // Tailwind "sm" breakpoint is 640px, so mobile is < 640
  const isMobile = useMediaQuery("(max-width: 639px)");
  const drawerId = useMemo(() => "mobile-nav-drawer", []);

  // close drawer/user menu on route change
  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!isMobile) return;

    const original = document.body.style.overflow;
    if (drawerOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [drawerOpen, isMobile]);

  // ESC to close open menus/drawer
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (userMenuOpen) setUserMenuOpen(false);
      if (drawerOpen) setDrawerOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userMenuOpen, drawerOpen]);

  const handleDrawerToggle = useCallback(() => {
    if (userMenuOpen) setUserMenuOpen(false);
    setDrawerOpen((prev) => !prev);
  }, [userMenuOpen]);

  const handleUserMenuToggle = useCallback(() => {
    if (drawerOpen) setDrawerOpen(false);
    setUserMenuOpen((prev) => !prev);
  }, [drawerOpen]);

  const userMenuRef = useRef<HTMLDivElement>(null);

  // click outside to close user menu (drawer uses overlay)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logo click: on mobile, toggles drawer; on desktop, still navigates via NavLink
  const Brand = (
    <div className="flex items-center">
      {isMobile ? (
        <button
          type="button"
          onClick={handleDrawerToggle}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xl font-bold text-gray-900 hover:bg-gray-50 focus:outline-none"
          aria-label={drawerOpen ? t("actions.close") : t("actions.open")}
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
        >
          <span>Spifex</span>
          {/* Arrow indicator */}
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${drawerOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            role="none"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="m12 6.662 9.665 8.59-1.33 1.495L12 9.337l-8.335 7.41-1.33-1.495L12 6.662Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      ) : (
        <NavLink to="/home" className="text-xl font-bold" end aria-label="Spifex">
          Spifex
        </NavLink>
      )}
    </div>
  );

  return (
    <>
      {/* Top bar */}
      <nav
        className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-100"
        aria-label={t("aria.mainNav")}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand (mobile toggles drawer; desktop navigates) */}
            {Brand}

            {/* Desktop links */}
            {!isMobile && (
              <div className="flex items-center space-x-4">
                <PermissionMiddleware codeName="view_cash_flow_button">
                  <NavLink
                    to="/cashflow"
                    end
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium ${
                        isActive ? "text-orange-500 font-bold" : "text-gray-800"
                      }`
                    }
                  >
                    {t("links.cashflow")}
                  </NavLink>
                </PermissionMiddleware>

                <PermissionMiddleware codeName="view_settled_button">
                  <NavLink
                    to="/settled"
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium ${
                        isActive ? "text-orange-500 font-bold" : "text-gray-800"
                      }`
                    }
                  >
                    {t("links.settled")}
                  </NavLink>
                </PermissionMiddleware>

                {(isSubscribed || isSuperUser) && (
                  <PermissionMiddleware codeName="view_report_button">
                    <NavLink
                      to="/reports"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-md text-sm font-medium ${
                          isActive ? "text-orange-500 font-bold" : "text-gray-800"
                        }`
                      }
                    >
                      {t("links.reports")}
                    </NavLink>
                  </PermissionMiddleware>
                )}
              </div>
            )}

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={handleUserMenuToggle}
                className="cursor-pointer flex items-center justify-center px-4 py-2 rounded-md text-gray-600 hover:text-gray-800 text-sm font-medium focus:outline-none"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={t("actions.menu")}
              >
                {t("actions.menu")}
                <svg
                  className={`h-4 w-4 ml-2 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  role="none"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="m12 6.662 9.665 8.59-1.33 1.495L12 9.337l-8.335 7.41-1.33-1.495L12 6.662Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {userMenuOpen && (
                <UserMenu onClose={() => setUserMenuOpen(false)} onHelpClick={() => setIsSimulatedAIOpen(true)} />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer + overlay */}
      {isMobile && (
        <>
          {/* Overlay (click to close) */}
          <div
            className={[
              "fixed inset-0 z-30 bg-black/30 transition-opacity",
              drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none",
            ].join(" ")}
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <div
            id={drawerId}
            className={[
              "fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-gray-200 z-40",
              "transform transition-transform duration-300",
              drawerOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
            aria-label={t("aria.drawerNav")}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex flex-col h-full p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Menu</div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label={t("actions.close")}
                  title={t("actions.close")}
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

              <nav className="mt-4 space-y-2">
                {/* Home (mobile only, as requested) */}
                <NavLink
                  to="/home"
                  end
                  onClick={() => setDrawerOpen(false)}
                  className="block p-2 rounded-md text-gray-800 hover:bg-gray-100"
                >
                  Home
                </NavLink>

                <PermissionMiddleware codeName="view_cash_flow_button">
                  <NavLink
                    to="/cashflow"
                    end
                    onClick={() => setDrawerOpen(false)}
                    className="block p-2 rounded-md text-gray-800 hover:bg-gray-100"
                  >
                    {t("links.cashflow")}
                  </NavLink>
                </PermissionMiddleware>

                <PermissionMiddleware codeName="view_settled_button">
                  <NavLink
                    to="/settled"
                    onClick={() => setDrawerOpen(false)}
                    className="block p-2 rounded-md text-gray-800 hover:bg-gray-100"
                  >
                    {t("links.settled")}
                  </NavLink>
                </PermissionMiddleware>

                {(isSubscribed || isSuperUser) && (
                  <PermissionMiddleware codeName="view_report_button">
                    <NavLink
                      to="/reports"
                      onClick={() => setDrawerOpen(false)}
                      className="block p-2 rounded-md text-gray-800 hover:bg-gray-100"
                    >
                      {t("links.reports")}
                    </NavLink>
                  </PermissionMiddleware>
                )}
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Help modal */}
      <SimulatedAI isOpen={isSimulatedAIOpen} onClose={() => setIsSimulatedAIOpen(false)} />
    </>
  );
};

export default Navbar;

// src/components/Navbar.tsx
import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PermissionMiddleware } from "@/middlewares";
import { useAuthContext } from "@/contexts/useAuthContext";

import UserMenu from "@/components/UserMenu";
import SimulatedAI from "@/components/SimulatedAI";

const Navbar: React.FC = () => {
  const { t } = useTranslation("navbar");

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSimulatedAIOpen, setIsSimulatedAIOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const location = useLocation();
  const { isSuperUser, isSubscribed } = useAuthContext();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // close drawer/user menu on route change
  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // ESC to close open menus/drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (userMenuOpen) setUserMenuOpen(false);
        if (drawerOpen) setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userMenuOpen, drawerOpen]);

  const handleDrawerToggle = () => {
    if (userMenuOpen) setUserMenuOpen(false);
    setDrawerOpen((prev) => !prev);
  };

  const handleUserMenuToggle = () => {
    if (drawerOpen) setDrawerOpen(false);
    setUserMenuOpen((prev) => !prev);
  };

  const userMenuRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setDrawerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* Top bar */}
      <nav
        className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-100"
        aria-label={t("aria.mainNav")}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + hamburger */}
            <div className="flex items-center">
              {isMobile && (
                <button
                  onClick={handleDrawerToggle}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-800 focus:outline-none"
                  aria-label={drawerOpen ? t("actions.close") : t("actions.open")}
                  title={drawerOpen ? t("actions.close") : t("actions.open")}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}

              <NavLink to="/cashflow" className="text-xl font-bold ml-2" end aria-label="Spifex">
                Spifex
              </NavLink>
            </div>

            {/* Desktop links */}
            {!isMobile && (
              <div className="flex items-center space-x-4">
                <PermissionMiddleware codeName="view_cash_flow_button" isPage={false}>
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

                <PermissionMiddleware codeName="view_settled_button" isPage={false}>
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
                  <PermissionMiddleware codeName="view_report_button" isPage={false}>
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
                className="flex items-center justify-center px-4 py-2 rounded-md text-gray-600 hover:text-gray-800 text-sm font-medium focus:outline-none"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={t("actions.menu")}
                title={t("actions.menu")}
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

      {/* Mobile drawer */}
      {isMobile && (
        <div
          ref={drawerRef}
          className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg border-r border-gray-200 transform ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 z-40`}
          aria-label={t("aria.drawerNav")}
        >
          <div className="flex flex-col h-full p-4">
            <button
              onClick={handleDrawerToggle}
              className="self-end p-2 text-gray-600 hover:text-gray-800"
              aria-label={t("actions.close")}
              title={t("actions.close")}
            >
              ✖
            </button>

            <nav className="mt-4 space-y-2">
              <PermissionMiddleware codeName="view_cash_flow_button" isPage={false}>
                <NavLink
                  to="/cashflow"
                  end
                  onClick={() => setDrawerOpen(false)}
                  className="block p-2 rounded-md text-gray-800 hover:bg-gray-100"
                >
                  {t("links.cashflow")}
                </NavLink>
              </PermissionMiddleware>

              <PermissionMiddleware codeName="view_settled_button" isPage={false}>
                <NavLink
                  to="/settled"
                  onClick={() => setDrawerOpen(false)}
                  className="block p-2 rounded-md text-gray-800 hover:bg-gray-100"
                >
                  {t("links.settled")}
                </NavLink>
              </PermissionMiddleware>

              {(isSubscribed || isSuperUser) && (
                <PermissionMiddleware codeName="view_report_button" isPage={false}>
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
      )}

      {/* Help modal */}
      <SimulatedAI isOpen={isSimulatedAIOpen} onClose={() => setIsSimulatedAIOpen(false)} />
    </>
  );
};

export default Navbar;

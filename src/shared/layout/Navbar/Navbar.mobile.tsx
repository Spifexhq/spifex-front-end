/* --------------------------------------------------------------------------
 * File: src/components/Navbar.mobile.tsx   (MOBILE — refactored)
 * -------------------------------------------------------------------------- */

import React, { useCallback, useMemo, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BarChart3, ChevronDown, Home, LayoutDashboard, Wallet, X } from "lucide-react";

import { PermissionMiddleware } from "@/middlewares";
import { useAuthContext } from "@/hooks/useAuth";

import UserMenu from "@/components/UserMenu";

type MobileNavItemProps = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  onNavigate: () => void;
  end?: boolean;
};

const MobileNavItem: React.FC<MobileNavItemProps> = ({ to, label, Icon, onNavigate, end }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) =>
      [
        "flex items-center gap-3",
        "rounded-lg px-3 py-2 text-sm font-medium",
        isActive ? "bg-gray-100 text-gray-900" : "text-gray-800 hover:bg-gray-100",
      ].join(" ")
    }
  >
    <Icon className="h-5 w-5 text-gray-700 shrink-0" aria-hidden />
    <span className="truncate">{label}</span>
  </NavLink>
);

type NavbarMobileProps = {
  userMenuOpen: boolean;
  drawerOpen: boolean;
  onToggleUserMenu: () => void;
  onCloseUserMenu: () => void;

  onToggleDrawer: () => void;
  onCloseDrawer: () => void;

  onOpenHelp: () => void;
  userMenuRef: React.RefObject<HTMLDivElement>;
};

const NavbarMobile: React.FC<NavbarMobileProps> = ({
  userMenuOpen,
  drawerOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  onToggleDrawer,
  onCloseDrawer,
  onOpenHelp,
  userMenuRef,
}) => {
  const { t } = useTranslation("navbar");
  const { isSuperUser, isSubscribed } = useAuthContext();

  const drawerId = useMemo(() => "mobile-nav-drawer", []);

  // Drag-to-close (entire drawer drag left)
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const MIN_SWIPE_PX = 50;

  const onDrawerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drawerOpen) return;

      startX.current = e.clientX;
      startY.current = e.clientY;
      activePointerId.current = e.pointerId;

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // no-op
      }
    },
    [drawerOpen]
  );

  const onDrawerPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drawerOpen) return;
      if (activePointerId.current !== e.pointerId) return;
      if (startX.current == null || startY.current == null) return;

      const dx = e.clientX - startX.current; // negative = dragged left
      const dy = e.clientY - startY.current;

      const isLeftDrag = dx < -MIN_SWIPE_PX;
      const isMostlyHorizontal = Math.abs(dx) > Math.abs(dy);

      if (isLeftDrag && isMostlyHorizontal) onCloseDrawer();

      startX.current = null;
      startY.current = null;
      activePointerId.current = null;

      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // no-op
      }
    },
    [drawerOpen, onCloseDrawer]
  );

  const onDrawerPointerCancel = useCallback(() => {
    startX.current = null;
    startY.current = null;
    activePointerId.current = null;
  }, []);

  // Brand click: toggles drawer (mobile)
  const Brand = (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onToggleDrawer}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xl font-bold text-gray-900 hover:bg-gray-50 focus:outline-none"
        aria-label={drawerOpen ? t("actions.close") : t("actions.open")}
        aria-expanded={drawerOpen}
        aria-controls={drawerId}
      >
        <span>Spifex</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${drawerOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );

  return (
    <>
      {/* Top bar */}
      <nav
        className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-[9999]"
        aria-label={t("aria.mainNav")}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {Brand}

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={onToggleUserMenu}
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

              {userMenuOpen && <UserMenu onClose={onCloseUserMenu} onHelpClick={onOpenHelp} />}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer + overlay */}
      <>
        {/* Overlay (blur + click to close) */}
        <div
          className={[
            "fixed inset-0 z-[120]",
            "bg-black/40 backdrop-blur-sm",
            "transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
          aria-hidden="true"
          onClick={onCloseDrawer}
        />

        {/* Drawer */}
        <div
          id={drawerId}
          className={[
            "fixed inset-y-0 left-0 z-[130] w-72 max-w-[calc(100vw-3rem)]",
            "bg-white shadow-xl border-r border-gray-200",
            "transform transition-transform duration-300 ease-in-out",
            "touch-none cursor-grab active:cursor-grabbing",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          aria-label={t("aria.drawerNav")}
          role="dialog"
          aria-modal="true"
          onPointerDown={onDrawerPointerDown}
          onPointerUp={onDrawerPointerUp}
          onPointerCancel={onDrawerPointerCancel}
          onPointerLeave={onDrawerPointerCancel}
        >
          <div className="flex flex-col h-full pointer-events-none">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 select-none pointer-events-auto">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-gray-900">Menu</div>
              </div>

              <button
                type="button"
                onClick={onCloseDrawer}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                aria-label={t("actions.close")}
                title={t("actions.close")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="p-4 space-y-1 overflow-y-auto pointer-events-auto">
              {/* Home (mobile only, as requested) */}
              <MobileNavItem
                to="/home"
                end
                label="Home"
                Icon={Home}
                onNavigate={onCloseDrawer}
              />

              <PermissionMiddleware codeName="view_cash_flow_page">
                <MobileNavItem
                  to="/cashflow"
                  end
                  label={t("links.cashflow")}
                  Icon={Wallet}
                  onNavigate={onCloseDrawer}
                />
              </PermissionMiddleware>

              <PermissionMiddleware codeName="view_settlement_page">
                <MobileNavItem
                  to="/settled"
                  label={t("links.settled")}
                  Icon={LayoutDashboard}
                  onNavigate={onCloseDrawer}
                />
              </PermissionMiddleware>

              {(isSubscribed || isSuperUser) && (
                <PermissionMiddleware codeName="view_report_page">
                  <MobileNavItem
                    to="/reports"
                    label={t("links.reports")}
                    Icon={BarChart3}
                    onNavigate={onCloseDrawer}
                  />
                </PermissionMiddleware>
              )}
            </nav>

            {/* Footer hint */}
            <div className="mt-auto p-4 border-t border-gray-200 pointer-events-auto">
              <div className="text-[11px] text-gray-500">
                {t("actions.swipeLeftToClose", { defaultValue: "Drag left to close" })}
              </div>
            </div>
          </div>
        </div>
      </>
    </>
  );
};

export default NavbarMobile;
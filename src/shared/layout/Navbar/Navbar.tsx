/* --------------------------------------------------------------------------
 * File: src/components/Navbar.tsx   (ORCHESTRATOR)
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import SimulatedAI from "@/components/SimulatedAI";
import NavbarDesktop from "./Navbar.desktop";
import NavbarMobile from "./Navbar.mobile";

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
  const location = useLocation();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSimulatedAIOpen, setIsSimulatedAIOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 639px)");

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const bodyOverflowRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isMobile) {
      if (bodyOverflowRef.current != null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
      return;
    }

    if (drawerOpen) {
      if (bodyOverflowRef.current == null) bodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return;
    }

    if (bodyOverflowRef.current != null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }
  }, [drawerOpen, isMobile]);

  const onEsc = useCallback(() => {
    if (userMenuOpen) setUserMenuOpen(false);
    if (drawerOpen) setDrawerOpen(false);
  }, [userMenuOpen, drawerOpen]);

  window.useGlobalEsc(userMenuOpen || drawerOpen, onEsc);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const handleDrawerToggle = useCallback(() => {
    if (userMenuOpen) setUserMenuOpen(false);
    setDrawerOpen((prev) => !prev);
  }, [userMenuOpen]);

  const handleUserMenuToggle = useCallback(() => {
    if (drawerOpen) setDrawerOpen(false);
    setUserMenuOpen((prev) => !prev);
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  const openHelp = useCallback(() => setIsSimulatedAIOpen(true), []);

  return (
    <>
      {isMobile ? (
        <NavbarMobile
          userMenuOpen={userMenuOpen}
          drawerOpen={drawerOpen}
          onToggleUserMenu={handleUserMenuToggle}
          onCloseUserMenu={closeUserMenu}
          onToggleDrawer={handleDrawerToggle}
          onCloseDrawer={closeDrawer}
          onOpenHelp={openHelp}
          userMenuRef={userMenuRef}
        />
      ) : (
        <NavbarDesktop
          userMenuOpen={userMenuOpen}
          onToggleUserMenu={handleUserMenuToggle}
          onCloseUserMenu={closeUserMenu}
          onOpenHelp={openHelp}
          userMenuRef={userMenuRef}
        />
      )}

      <SimulatedAI isOpen={isSimulatedAIOpen} onClose={() => setIsSimulatedAIOpen(false)} />
    </>
  );
};

export default Navbar;

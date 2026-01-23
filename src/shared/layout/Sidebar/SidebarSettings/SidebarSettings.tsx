/* -------------------------------------------------------------------------- */
/* File: src/components/layout/Sidebar/SidebarSettings.tsx   (ORCHESTRATOR)    */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import SidebarSettingsDesktop from "./SidebarSettings.desktop";
import SidebarSettingsMobile from "./SidebarSettings.mobile";

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

    // Legacy fallback (typed to avoid deprecated lib.dom.d.ts signatures)
    const legacy = mql as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };

    legacy.addListener?.(handler);
    return () => legacy.removeListener?.(handler);
  }, [query]);

  return matches;
}

const SidebarSettings: React.FC<SidebarSettingsProps> = (props) => {
  const location = useLocation();

  // Tailwind "md" breakpoint is 768px, so mobile is < 768
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Close mobile drawer on route change for consistency
  useEffect(() => {
    props.onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // If leaving mobile, ensure drawer is closed
  useEffect(() => {
    if (!isMobile) props.onMobileClose?.();
  }, [isMobile, props]);

  return isMobile ? <SidebarSettingsMobile {...props} /> : <SidebarSettingsDesktop {...props} />;
};

export default SidebarSettings;

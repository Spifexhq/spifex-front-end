// src/layouts/SettingsLayout/index.tsx
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import SidebarSettings from "@/components/layout/Sidebar/SidebarSettings";

function useMediaQuery(query: string): boolean {
  const getMatch = () => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Set initial value
    setMatches(mql.matches);

    // Modern browsers
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }

    // Legacy fallback (older Safari)
    const legacy = mql as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };

    if (typeof legacy.addListener === "function") {
      legacy.addListener(handler);
      return () => legacy.removeListener?.(handler);
    }

    // Very last fallback
    mql.onchange = handler;
    return () => {
      mql.onchange = null;
    };
  }, [query]);

  return matches;
}

export const SettingsLayout: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const topOffsetPx = 64;
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const activeItem = useMemo(() => {
    const [, root, slug] = location.pathname.split("/");
    return root === "settings" ? slug || "personal" : "personal";
  }, [location.pathname]);

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (isDesktop) return;

    const original = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen, isDesktop]);

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/settings/${id}`);
      setMobileOpen(false);
    },
    [navigate]
  );

  return (
    <>
      <SidebarSettings
        activeItem={activeItem}
        topOffsetPx={topOffsetPx}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onSelect={handleSelect}
      />

      <div className="md:ml-64">
        {/* Mobile-only top bar */}
        <div className="md:hidden border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              aria-label="Open settings navigation"
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
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">Settings</div>
            </div>
          </div>
        </div>

        <Outlet />
      </div>
    </>
  );
};

export default SettingsLayout;

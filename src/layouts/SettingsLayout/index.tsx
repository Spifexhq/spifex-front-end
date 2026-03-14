import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { SidebarSettings } from "@/shared/layout/Sidebar";

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

    setMatches(mql.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }

    const legacy = mql as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };

    if (typeof legacy.addListener === "function") {
      legacy.addListener(handler);
      return () => legacy.removeListener?.(handler);
    }

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

      {!isDesktop && !mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open settings navigation"
          aria-expanded={mobileOpen}
          className={[
            "fixed z-30 md:hidden",
            "left-1/2 -translate-x-1/2",
            "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
            "inline-flex h-11 w-11 items-center justify-center rounded-2xl",
            "border border-slate-200 bg-white/90 shadow-lg backdrop-blur",
            "text-slate-700 hover:bg-slate-100",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
            "transition-colors",
          ].join(" ")}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <div className="md:ml-64">
        <Outlet />
      </div>
    </>
  );
};

export default SettingsLayout;
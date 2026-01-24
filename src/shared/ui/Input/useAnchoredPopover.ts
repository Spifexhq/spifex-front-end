import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type LegacyMQL = MediaQueryList & {
  addListener?: (listener: (ev: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (ev: MediaQueryListEvent) => void) => void;
};

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql: MediaQueryList = window.matchMedia(query);
    const onChange = (ev: MediaQueryListEvent) => setMatches(ev.matches);

    setMatches(mql.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    const legacy = mql as LegacyMQL;
    legacy.addListener?.(onChange);
    return () => legacy.removeListener?.(onChange);
  }, [query]);

  return matches;
}

type Options = {
  open: boolean;
  onClose: () => void;

  anchorRef: RefObject<HTMLElement>;

  mobileFullWidth?: boolean;
  offsetPx?: number;
  maxHeightPx?: number;
  marginPx?: number;

  /** important when popover must appear over modals */
  zIndex?: number;
};

export function useAnchoredPopover({
  open,
  onClose,
  anchorRef,
  mobileFullWidth = true,
  offsetPx = 8,
  maxHeightPx = 360,
  marginPx = 8,
  zIndex = 10050, // > modal z-[9999]
}: Options) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const [style, setStyle] = useState<React.CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    zIndex,
    visibility: "hidden",
  });

  function hasTransientOverlayOpen() {
    return !!document.querySelector(
      '[data-select-open="true"],[data-menu-open="true"],[data-popover-open="true"]'
    );
  }

  const closeTransientOverlays = useCallback((): boolean => {
    if (typeof document === "undefined") return false;
    if (!hasTransientOverlayOpen()) return false;

    // Avoid treating *this* popover as a "transient overlay"
    const pop = popoverRef.current;
    const found = document.querySelector(
      '[data-select-open="true"],[data-menu-open="true"],[data-popover-open="true"]'
    ) as HTMLElement | null;

    if (pop && found && found === pop) {
      return false;
    }

    const target = document.body || document.documentElement;
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    return true;
  }, []);

  const onEsc = useCallback(() => {
    // Close transient overlays (SelectDropdown/Menu/Popover) before closing THIS popover
    if (closeTransientOverlays()) return;
    onClose();
  }, [closeTransientOverlays, onClose]);

  // Global ESC (stacked). Assumes initGlobalEsc is imported somewhere in app bootstrap.
  window.useGlobalEsc(open, onEsc);

  // Positioning
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const r = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const maxH = Math.min(maxHeightPx, Math.max(160, vh - marginPx * 2));

      let width = r.width;
      let left = r.left;

      if (isMobile && mobileFullWidth) {
        width = vw - marginPx * 2;
        left = marginPx;
      } else {
        width = Math.min(width, vw - marginPx * 2);
        left = Math.min(Math.max(left, marginPx), vw - marginPx - width);
      }

      const spaceBelow = vh - r.bottom - marginPx;
      const spaceAbove = r.top - marginPx;
      const preferBottom = spaceBelow >= 240 || spaceBelow >= spaceAbove;

      const top = preferBottom
        ? Math.min(r.bottom + offsetPx, vh - marginPx - maxH)
        : Math.max(marginPx, r.top - offsetPx - maxH);

      setStyle({
        position: "fixed",
        top,
        left,
        width,
        maxHeight: maxH,
        zIndex,
        visibility: "visible",
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, isMobile, mobileFullWidth, offsetPx, maxHeightPx, marginPx, zIndex]);

  // Click outside to close (keep)
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;

    const onPointerDown = (e: Event) => {
      const t = e.target as Node | null;
      const pop = popoverRef.current;
      const anchor = anchorRef.current;

      if (!t) return;
      if (pop && pop.contains(t)) return;
      if (anchor && anchor.contains(t)) return;

      onClose();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, onClose, anchorRef]);

  // Mobile: lock body scroll while open
  useEffect(() => {
    if (!open) return;
    if (!isMobile) return;
    if (typeof document === "undefined") return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  return { popoverRef, style, isMobile };
}

/* -------------------------------------------------------------------------- */
/* File: src/shared/ui/Popover.tsx                                             */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_MS = 150;

type AnchorPos = { top: number; left: number };

function toCssSize(v?: number | string): string | undefined {
  if (v == null) return undefined;
  return typeof v === "number" ? `${v}px` : v;
}

export const Popover: React.FC<{
  open: boolean;
  onClose(): void;
  children: React.ReactNode;

  className?: string;

  anchorRef?: React.RefObject<HTMLElement | null>;

  width?: number | string;
  height?: number | string;

  isMobile?: boolean;
  title?: string;
}> = ({ open, onClose, children, className, anchorRef, width, height, isMobile, title }) => {
  const popRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const closeTimerRef = useRef<number | null>(null);

  // IMPORTANT: double rAF for reliable enter transition
  const openRaf1Ref = useRef<number | null>(null);
  const openRaf2Ref = useRef<number | null>(null);

  const [pos, setPos] = useState<AnchorPos | null>(null);

  const hasAnchor = !!anchorRef?.current;

  const computeAnchorPos = useCallback(() => {
    const anc = anchorRef?.current;
    if (!anc) return null;

    const r = anc.getBoundingClientRect();
    return {
      top: r.bottom + window.scrollY,
      left: r.left + window.scrollX,
    };
  }, [anchorRef]);

  const cancelOpenRafs = useCallback(() => {
    if (openRaf1Ref.current != null) window.cancelAnimationFrame(openRaf1Ref.current);
    if (openRaf2Ref.current != null) window.cancelAnimationFrame(openRaf2Ref.current);
    openRaf1Ref.current = null;
    openRaf2Ref.current = null;
  }, []);

  // Mount/unmount + compute position ON OPEN
  useEffect(() => {
    if (open) {
      setMounted(true);

      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
      cancelOpenRafs();

      if (anchorRef?.current) setPos(computeAnchorPos());
      else setPos(null);

      // Ensure first paint happens with "closed" classes, then open on next paint.
      setIsOpen(false);
      openRaf1Ref.current = window.requestAnimationFrame(() => {
        openRaf2Ref.current = window.requestAnimationFrame(() => {
          setIsOpen(true);
        });
      });

      return;
    }

    if (!mounted) return;

    // Close flow
    setIsOpen(false);
    cancelOpenRafs();

    if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      setPos(null);
    }, CLOSE_MS);
  }, [open, mounted, anchorRef, computeAnchorPos, cancelOpenRafs]);

  // Keep anchored position synced while open (minimal listeners)
  useEffect(() => {
    if (!open) return;
    if (!anchorRef?.current) return;

    let rafId: number | null = null;

    const schedule = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        setPos(computeAnchorPos());
      });
    };

    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);

    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [open, anchorRef, computeAnchorPos]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      cancelOpenRafs();
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    };
  }, [cancelOpenRafs]);

  const closeWithAnimation = useCallback(() => {
    onClose();
  }, [onClose]);

  // Outside click (ignore clicks on the anchor to avoid close->open bug)
  useEffect(() => {
    if (!mounted) return;

    const onMouseDown = (e: MouseEvent) => {
      const pop = popRef.current;
      const anc = anchorRef?.current;
      const target = e.target as Node | null;

      if (!target) return;
      if (pop && pop.contains(target)) return;
      if (anc && anc.contains(target)) return;

      closeWithAnimation();
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [mounted, anchorRef, closeWithAnimation]);

  // ESC
  window.useGlobalEsc(isOpen, closeWithAnimation);

  const portalTarget = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.body;
  }, []);

  if (!mounted || !portalTarget) return null;

  const sizeStyle: React.CSSProperties = {
    width: toCssSize(width),
    height: toCssSize(height),
  };

  /* --------------------------------- Mobile -------------------------------- */
  if (isMobile) {
    return createPortal(
      <div
        className={[
          "fixed inset-0 z-[999] flex items-end justify-center p-2",
          "transition-opacity duration-150 ease-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          "bg-black/30",
        ].join(" ")}
        aria-hidden={!isOpen}
      >
        <div
          ref={popRef}
          style={sizeStyle}
          className={[
            "w-full max-w-lg rounded-t-xl border border-gray-200 bg-white p-4",
            "shadow-lg",
            "origin-bottom",
            "transition-all duration-150 ease-out",
            isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            className || "",
          ].join(" ")}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-800 truncate">{title || ""}</div>
            <button
              className="text-[22px] text-gray-400 hover:text-gray-700 leading-none"
              onClick={closeWithAnimation}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
          </div>

          {children}
        </div>
      </div>,
      portalTarget
    );
  }

  /* -------------------------------- Desktop -------------------------------- */
  if (hasAnchor && pos) {
    return createPortal(
      <div className="absolute z-[999]" style={{ top: pos.top, left: pos.left }}>
        <div className="mt-1">
          <div
            ref={popRef}
            style={sizeStyle}
            className={[
              "rounded-md border border-gray-300 bg-white",
              "shadow-lg",
              "origin-top",
              "transition-all duration-150 ease-out",
              isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none",
              className || "",
            ].join(" ")}
            data-popover-open={isOpen ? "true" : "false"}
          >
            {children}
          </div>
        </div>
      </div>,
      portalTarget
    );
  }

  return (
    <div className="absolute z-[999] mt-1">
      <div
        ref={popRef}
        style={sizeStyle}
        className={[
          "rounded-md border border-gray-300 bg-white p-3",
          "shadow-lg",
          "origin-top",
          "transition-all duration-150 ease-out",
          isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none",
          className || "",
        ].join(" ")}
        data-popover-open={isOpen ? "true" : "false"}
      >
        {children}
      </div>
    </div>
  );
};

Popover.displayName = "Popover";
export default Popover;

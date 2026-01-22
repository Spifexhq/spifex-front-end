import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOnClickOutside } from "../hooks/useOnClickOutside";

const CLOSE_MS = 150;

export const Popover: React.FC<{
  children: React.ReactNode;
  onClose(): void;
  className?: string;
  isMobile?: boolean;
  title?: string;
}> = ({ children, onClose, className, isMobile, title }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const openRafRef = useRef<number | null>(null);

  useEffect(() => {
    openRafRef.current = window.requestAnimationFrame(() => setIsOpen(true));

    return () => {
      if (openRafRef.current != null) window.cancelAnimationFrame(openRafRef.current);
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const closeWithAnimation = useCallback(() => {
    setIsOpen(false);
    if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);

    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, CLOSE_MS);
  }, [onClose]);

  useOnClickOutside(ref, closeWithAnimation, true);

  if (isMobile) {
    return (
      <div
        className={[
          "fixed inset-0 z-[9999] flex items-end justify-center p-2",
          "transition-opacity duration-150 ease-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          "bg-black/30",
        ].join(" ")}
        aria-hidden={!isOpen}
      >
        <div
          ref={ref}
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
      </div>
    );
  }

  return (
    <div className="absolute z-[999] mt-1">
      <div
        ref={ref}
        className={[
          "rounded-md border border-gray-300 bg-white p-3",
          "shadow-lg",
          "origin-top",
          "transition-all duration-150 ease-out",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none",
          className || "",
        ].join(" ")}
        data-popover-open={isOpen ? "true" : "false"}
      >
        {children}
      </div>
    </div>
  );
};

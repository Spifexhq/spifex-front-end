import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { SnackbarProps } from "./Snackbar.types";

const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

const severityStyles = (severity: SnackbarProps["severity"]) => {
  switch (severity) {
    case "success":
      return {
        bg: "bg-[color:var(--accentSuccess)]/10",
        border: "border-[color:var(--accentSuccess)]/30",
        ring: "ring-[color:var(--accentSuccess)]/20",
        text: "text-gray-900",
      };
    case "error":
      return {
        bg: "bg-[color:var(--accentDanger)]/10",
        border: "border-[color:var(--accentDanger)]/30",
        ring: "ring-[color:var(--accentDanger)]/20",
        text: "text-gray-900",
      };
    case "warning":
      return {
        bg: "bg-[color:var(--accentWarning)]/10",
        border: "border-[color:var(--accentWarning)]/30",
        ring: "ring-[color:var(--accentWarning)]/20",
        text: "text-gray-900",
      };
    case "info":
    default:
      return {
        bg: "bg-white",
        border: "border-gray-200",
        ring: "ring-[color:var(--accentInfo)]/15",
        text: "text-gray-900",
      };
  }
};

const anchorToClasses = (anchor: NonNullable<SnackbarProps["anchor"]>) => {
  const v = anchor.vertical === "top" ? "top-4" : "bottom-4";
  const h =
    anchor.horizontal === "center"
      ? "left-1/2 -translate-x-1/2"
      : anchor.horizontal === "left"
      ? "left-4"
      : "right-4";
  const enterDir = anchor.vertical === "top" ? "-translate-y-2" : "translate-y-2";
  return { container: cls("fixed z-[9999]", v, h), enterDir };
};

const Snackbar: React.FC<SnackbarProps> = ({
  open,
  autoHideDuration,
  onClose,
  className = "",
  message,
  severity = "info",
  children,
  anchor = { vertical: "bottom", horizontal: "center" },
  transitionDuration = 220,
  pauseOnHover = true,
  dismissOnClick = false,
  showCloseButton = true,
  maxWidthClassName = "max-w-md",
}) => {
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(open);
  const [clickClosing, setClickClosing] = useState(false);

  const timerRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const remainingRef = useRef<number | null>(null);

  const clickFadeMs = 140;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (ms: number) => {
      clearTimer();
      remainingRef.current = ms;
      endTimeRef.current = Date.now() + ms;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onClose();
      }, ms);
    },
    [clearTimer, onClose]
  );

  const pauseTimer = useCallback(() => {
    if (!pauseOnHover || !timerRef.current) return;
    const remaining = (endTimeRef.current ?? 0) - Date.now();
    remainingRef.current = Math.max(0, remaining);
    clearTimer();
  }, [pauseOnHover, clearTimer]);

  const resumeTimer = useCallback(() => {
    if (!pauseOnHover) return;
    if (remainingRef.current && remainingRef.current > 0) {
      startTimer(remainingRef.current);
    }
  }, [pauseOnHover, startTimer]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = window.setTimeout(() => setShow(true), 10);
      return () => window.clearTimeout(t);
    } else {
      setShow(false);
      const dur = clickClosing ? clickFadeMs : transitionDuration;
      const t = window.setTimeout(() => {
        setMounted(false);
        setClickClosing(false);
      }, dur);
      return () => window.clearTimeout(t);
    }
  }, [open, transitionDuration, clickClosing]);

  useEffect(() => {
    if (open && autoHideDuration) {
      startTimer(autoHideDuration);
      return clearTimer;
    }
    return clearTimer;
  }, [open, autoHideDuration, startTimer, clearTimer]);

  const sev = useMemo(() => severityStyles(severity), [severity]);
  const { container, enterDir } = useMemo(() => anchorToClasses(anchor), [anchor]);

  if (!mounted) return null;

  const role = severity === "error" ? "alert" : "status";
  const ariaLive = severity === "error" ? "assertive" : "polite";
  const cardTransitionDuration = clickClosing ? clickFadeMs : transitionDuration;

  const isCustom = !!children;

  return createPortal(
    <div className={cls(container, "px-4 py-2", "pointer-events-none")}>
      <div
        className={cls(
          "transform transition-all motion-reduce:transition-none",
          show ? "opacity-100 translate-y-0" : cls("opacity-0", enterDir)
        )}
        style={{ transitionDuration: `${cardTransitionDuration}ms` }}
        role={role}
        aria-live={ariaLive}
        aria-atomic="true"
      >
        {isCustom ? (
          // ── CUSTOM CONTENT: sem card do Snackbar (zero bg/border/shadow) ─────────
          <div
            className={cls(
              "pointer-events-auto mx-auto",
              maxWidthClassName,
              className // aplica somente utilitários do chamador
            )}
            onMouseEnter={pauseTimer}
            onMouseLeave={resumeTimer}
            onClick={() => {
              if (!dismissOnClick) return;
              clearTimer();
              setClickClosing(true);
              setShow(false);
              window.setTimeout(() => onClose(), clickFadeMs);
            }}
            style={{ transitionDuration: `${cardTransitionDuration}ms` }}
          >
            {children}
          </div>
        ) : (
          // ── MESSAGE SIMPLES: 1 ÚNICO CARD estilizado pelo Snackbar ───────────────
          <div
            className={cls(
              "pointer-events-auto",
              "mx-auto rounded-lg border shadow-lg ring-1",
              sev.bg,
              sev.border,
              sev.ring,
              sev.text,
              "flex items-start",
              maxWidthClassName,
              className
            )}
            style={{ transitionDuration: `${cardTransitionDuration}ms` }}
            onMouseEnter={pauseTimer}
            onMouseLeave={resumeTimer}
            onClick={() => {
              if (!dismissOnClick) return;
              clearTimer();
              setClickClosing(true);
              setShow(false);
              window.setTimeout(() => onClose(), clickFadeMs);
            }}
          >
            <div className="py-3 px-3 grow">
              <div className="text-sm leading-relaxed">{message}</div>
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearTimer();
                  setShow(false);
                  window.setTimeout(() => onClose(), cardTransitionDuration);
                }}
                className={cls(
                  "ml-auto p-2 text-gray-500 hover:text-gray-700",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accentPrimary)]"
                )}
                aria-label="Fechar notificação"
              >
                <span className="block h-4 w-4 leading-none">×</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Snackbar;

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { SnackbarProps } from "./Snackbar.types";

/**
 * Snackbar — 100% Tailwind, fluido, minimalista e acessível
 * - Portal no body
 * - Transições suaves (opacity + translate)
 * - Âncoras (top/bottom x left/center/right)
 * - Auto-hide com pausa em hover (opcional)
 * - Clique-para-fechar (opcional) + botão fechar
 * - Respeita cores via CSS variables do projeto (ex.: --accentSuccess, etc.)
 */

const cls = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

const severityStyles = (severity: SnackbarProps["severity"]) => {
  switch (severity) {
    case "success":
      return {
        bar: "bg-[color:var(--accentSuccess)]",
        ring: "ring-[color:var(--accentSuccess)]/20",
      };
    case "error":
      return {
        bar: "bg-[color:var(--accentDanger)]",
        ring: "ring-[color:var(--accentDanger)]/20",
      };
    case "warning":
      return {
        bar: "bg-[color:var(--accentWarning)]",
        ring: "ring-[color:var(--accentWarning)]/20",
      };
    case "info":
    default:
      return {
        bar: "bg-[color:var(--accentInfo)]",
        ring: "ring-[color:var(--accentInfo)]/20",
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
  /** controla montagem/desmontagem suave */
  const [mounted, setMounted] = useState(open);
  /** controla estado visual (abre/fecha) para as classes de transição */
  const [show, setShow] = useState(open);
  /** aceleração no clique */
  const [clickClosing, setClickClosing] = useState(false);

  const timerRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const remainingRef = useRef<number | null>(null);

  const clickFadeMs = 140; // fade mais rápido no clique

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

  // Monta/desmonta + animação sincronizada (texto + cartão)
  useEffect(() => {
    if (open) {
      setMounted(true);
      // próximo tick para permitir a transição
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

  // Auto-hide
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

  // Cartão (texto + fundo + borda) anima junto -> sem “fantasma” de quadrado
  const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      className={cls(
        "pointer-events-auto",
        "rounded-lg border border-gray-200 shadow-lg ring-1",
        sev.ring,
        "bg-white text-gray-900",
        "flex items-start",
        maxWidthClassName
      )}
      style={{
        transitionDuration: `${cardTransitionDuration}ms`,
      }}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onClick={() => {
        if (!dismissOnClick) return;
        // acelera fade e chama onClose após o fade curto
        clearTimer();
        setClickClosing(true);
        setShow(false);
        window.setTimeout(() => onClose(), clickFadeMs);
      }}
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
    >
      {/* Barra lateral por severidade */}
      <div className={cls("w-1 rounded-l-lg", sev.bar)} aria-hidden="true" />
      <div className="py-3 px-3">{children}</div>
      {showCloseButton && (
        <button
          type="button"
          onClick={() => {
            clearTimer();
            setShow(false);
            window.setTimeout(() => onClose(), cardTransitionDuration);
          }}
          className={cls(
            "ml-auto p-2 text-gray-500 hover:text-gray-700",
            "focus:outline-none",
            "ring-[color:var(--accentPrimary)]"
          )}
          aria-label="Fechar notificação"
        >
          <span className="block h-4 w-4 leading-none">×</span>
        </button>
      )}
    </div>
  );

  const content =
    children ??
    (message != null ? <div className="text-sm leading-relaxed">{message}</div> : null);

  return createPortal(
    <div className={cls(container, "px-4 py-2", "pointer-events-none")}>
      <div
        className={cls(
          "pointer-events-auto", // permite click apenas no card
          "transform transition-all motion-reduce:transition-none",
          show ? "opacity-100 translate-y-0" : cls("opacity-0", enterDir)
        )}
        style={{ transitionDuration: `${cardTransitionDuration}ms` }}
      >
        <div className={cls("flex justify-center", className)}>
          <Card>{content}</Card>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Snackbar;
/* -------------------------------------------------------------------------- *
 * Reusable floating confirmation toast
 * - Keyboard: ESC cancels; focused buttons use native keyboard activation
 * - Focus trap-lite: auto-focuses first button
 * - Variants: default | danger (red confirm)
 * - Mobile: collapses to a compact prompt and springs back open
 * -------------------------------------------------------------------------- */

import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, { useId, useRef, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Button from "@/shared/ui/Button";
import { useFeedbackStack } from "@/shared/ui/FeedbackStack";

export type ConfirmToastProps = {
  open: boolean;
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  variant?: "default" | "danger";
};

const ConfirmToast: React.FC<ConfirmToastProps> = ({
  open,
  text,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  variant = "default",
}) => {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const stack = useFeedbackStack();
  const inStack = Boolean(stack);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [collapsed, setCollapsed] = useState(false);
  const bodyCollapsed = isMobile && collapsed;
  const descriptionId = useId();
  const bodyId = useId();
  const visibleRef = useRef(open);
  visibleRef.current = open;
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusOnExpand = useRef(false);

  // A new confirmation always starts expanded.
  useEffect(() => {
    if (open) setCollapsed(false);
  }, [open, text]);

  useEffect(() => {
    if (!isMobile) setCollapsed(false);
  }, [isMobile]);

  // A zero-height panel still contains focusable buttons; make it inert while closed.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (bodyCollapsed) body.setAttribute("inert", "");
    else body.removeAttribute("inert");
  }, [bodyCollapsed]);

  const onEsc = useCallback(() => {
    if (!busy) onCancel();
  }, [busy, onCancel]);

  window.useGlobalEsc(open, onEsc);

  const toggle = () => {
    if (busy) return;
    setCollapsed((value) => {
      if (value) restoreFocusOnExpand.current = true;
      return !value;
    });
  };

  const bodyTransition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.7 };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && <motion.div
        key="confirmation"
        role="alertdialog"
        aria-describedby={descriptionId}
        aria-label={text}
        initial={{ opacity: 0, y: reduced ? 0 : 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : 5 }}
        transition={{ duration: reduced ? 0 : .15, ease: "easeOut" }}
        onAnimationComplete={() => {
          if (!visibleRef.current || busy) return;
          if (bodyCollapsed) toggleRef.current?.focus({ preventScroll: true });
          else cancelRef.current?.focus({ preventScroll: true });
        }}
        className={`${inStack ? "pointer-events-auto" : "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[15000] -translate-x-1/2 sm:bottom-6"} w-[calc(100vw-24px)] max-w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_32px_#26334d20] sm:p-4`}
      >
        <div className="flex items-start gap-2">
          <p id={descriptionId} className="min-w-0 flex-1 text-xs leading-5 text-gray-700">{text}</p>
          {isMobile && <button
            ref={toggleRef}
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={t(collapsed ? "floatingPanel.restore" : "floatingPanel.minimize")}
            title={t(collapsed ? "floatingPanel.restore" : "floatingPanel.minimize")}
            className="-mr-1.5 -mt-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <motion.span aria-hidden animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: reduced ? 0 : .2 }} className="inline-flex">
              <ChevronDown size={15} aria-hidden="true" />
            </motion.span>
          </button>}
        </div>

        <motion.div
          id={bodyId}
          ref={bodyRef}
          initial={false}
          animate={bodyCollapsed ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
          transition={bodyTransition}
          className="overflow-hidden"
          aria-hidden={bodyCollapsed || undefined}
          onAnimationComplete={() => {
            if (bodyCollapsed || busy || !restoreFocusOnExpand.current) return;
            restoreFocusOnExpand.current = false;
            cancelRef.current?.focus({ preventScroll: true });
          }}
        >
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
            <Button type="button" size="sm" ref={cancelRef} variant="outline" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button type="button" size="sm" variant={variant === "danger" ? "danger" : "outlineBlack"} onClick={onConfirm} disabled={busy} isLoading={busy}>
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>,
    stack ?? document.body
  );
};

export default ConfirmToast;

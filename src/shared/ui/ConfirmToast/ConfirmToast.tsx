/* -------------------------------------------------------------------------- *
 * Reusable floating confirmation toast
 * - Keyboard: ESC cancels; focused buttons use native keyboard activation
 * - Focus trap-lite: auto-focuses first button
 * - Variants: default | danger (red confirm)
 * -------------------------------------------------------------------------- */

import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, { useId, useRef, useCallback } from "react";
import Button from "@/shared/ui/Button";

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
  const reduced = useReducedMotion();
  const descriptionId = useId();
  const visibleRef = useRef(open);
  visibleRef.current = open;
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const onEsc = useCallback(() => {
    if (!busy) onCancel();
  }, [busy, onCancel]);

  window.useGlobalEsc(open, onEsc);

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
        onAnimationComplete={() => { if (visibleRef.current && !busy) cancelRef.current?.focus({ preventScroll: true }); }}
        className="fixed bottom-4 left-1/2 z-[9000] w-[calc(100vw-24px)] max-w-[320px] -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_32px_#26334d20] sm:bottom-6 sm:p-4"
      >
        <p id={descriptionId} className="text-xs leading-5 text-gray-700">{text}</p>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
          <Button type="button" size="sm" ref={cancelRef} variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" size="sm" variant={variant === "danger" ? "danger" : "outlineBlack"} onClick={onConfirm} disabled={busy} isLoading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </motion.div>}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmToast;

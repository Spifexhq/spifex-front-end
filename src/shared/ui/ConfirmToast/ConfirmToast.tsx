/* -------------------------------------------------------------------------- *
 * Reusable floating confirmation toast
 * - Keyboard: ESC cancels, Enter confirms
 * - Focus trap-lite: auto-focuses first button
 * - Variants: default | danger (red confirm)
 * -------------------------------------------------------------------------- */

import React, { useEffect, useRef } from "react";
import Button from "@/shared/ui/Button";

export type ConfirmToastProps = {
  open: boolean;
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  /** UI hint only (styles). */
  variant?: "default" | "danger";
};

const ConfirmToast: React.FC<ConfirmToastProps> = ({
  open,
  text,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  busy = false,
  variant = "default",
}) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // ESC/Enter handlers when open
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!busy) onCancel();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (!busy) onConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel, onConfirm]);

  // Autofocus cancel button when opens
  useEffect(() => {
    if (open && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const confirmVariant =
    variant === "danger" ? "common" /* your destructive style */ : "outline";

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white border border-gray-200 shadow-xl rounded-lg px-4 py-3 w-[360px] max-w-[90vw]"
      >
        <div className="text-[13px] text-gray-800">{text}</div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            ref={cancelRef}
            variant="cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmToast;

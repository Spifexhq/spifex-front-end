/* -------------------------------------------------------------------------- *
 * Reusable floating confirmation toast
 * - Keyboard: ESC cancels, Enter confirms
 * - Focus trap-lite: auto-focuses first button
 * - Variants: default | danger (red confirm)
 * -------------------------------------------------------------------------- */

import React, { useEffect, useRef, useCallback } from "react";
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
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const onEsc = useCallback(() => {
    if (!busy) onCancel();
  }, [busy, onCancel]);

  window.useGlobalEsc(open, onEsc);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.code !== "Enter") return;
      e.preventDefault();
      if (!busy) onConfirm();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onConfirm]);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const confirmVariant = variant === "danger" ? "common" : "outline";

  return (
    <div className="fixed bottom-6 right-6 z-[9000]">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white border border-gray-200 shadow-xl rounded-lg px-4 py-3 w-[360px] max-w-[90vw]"
      >
        <div className="text-[13px] text-gray-800">{text}</div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button ref={cancelRef} variant="cancel" onClick={onCancel} disabled={busy}>
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

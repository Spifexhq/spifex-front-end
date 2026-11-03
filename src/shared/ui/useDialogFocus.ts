import { useEffect, type RefObject } from "react";

/** Keep keyboard focus inside an open dialog and restore its trigger on close. */
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]'
    ) ?? []).filter(element => element.getClientRects().length && !element.closest('[inert]'));
    const frame = requestAnimationFrame(() => (focusable()[0] ?? ref.current)?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); ref.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", handleKey); if (previous?.isConnected) previous.focus(); };
  }, [open, ref]);
}

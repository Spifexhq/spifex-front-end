import { useCallback, useEffect, useRef, useState } from "react";

/** Timer lifetime follows a notification, never the parent's render callbacks. */
export function useSnackbarLifecycle(open: boolean, identity: unknown, duration: number | null, onClose: () => void) {
  const callback = useRef(onClose); callback.current = onClose;
  const [dismissed, setDismissed] = useState(false);
  const close = useRef<() => void>(() => {});
  const pause = useRef<(reason: string, active: boolean) => void>(() => {});
  const dismiss = useCallback(() => close.current(), []);
  useEffect(() => {
    setDismissed(false);
    if (!open) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let remaining = duration ?? 0, started = 0, closed = false;
    const reasons = new Set<string>();
    const stop = () => { clearTimeout(timer); timer = undefined; };
    const finish = () => {
      if (closed) return;
      closed = true; stop(); setDismissed(true); callback.current();
    };
    const start = () => {
      if (closed || reasons.size || duration === null || duration <= 0) return;
      started = Date.now(); timer = setTimeout(finish, Math.max(0, remaining));
    };
    close.current = finish;
    pause.current = (reason, active) => {
      if (active) {
        if (!reasons.size && timer !== undefined) { remaining = Math.max(0, remaining - (Date.now() - started)); stop(); }
        reasons.add(reason);
      } else if (reasons.delete(reason) && !reasons.size) start();
    };
    start();
    return () => { closed = true; stop(); close.current = () => {}; pause.current = () => {}; };
  }, [open, identity, duration]);
  return { visible: open && !dismissed, dismiss, pause: useCallback((reason: string, active: boolean) => pause.current(reason, active), []) };
}

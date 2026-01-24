// src/shared/esc/initGlobalEsc.ts
import { useEffect, useRef } from "react";

export type EscHandler = () => void;

type Entry = {
  id: string;
  enabled: boolean;
  order: number; // higher = more recent
  handler: EscHandler;
};

type EscCore = {
  register: (handler: EscHandler) => string;
  unregister: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  activate: (id: string) => void;
  setHandler: (id: string, handler: EscHandler) => void;
};

type UseGlobalEsc = (enabled: boolean, handler: EscHandler) => void;

declare global {
  interface Window {
    __ESC__?: EscCore;
    useGlobalEsc: UseGlobalEsc;
  }
}

function createEscController(): EscCore {
  let orderCounter = 0;
  const entries = new Map<string, Entry>();
  let listening = false;

  const getTopEnabled = (): Entry | null => {
    let top: Entry | null = null;
    for (const e of entries.values()) {
      if (!e.enabled) continue;
      if (!top || e.order > top.order) top = e;
    }
    return top;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" && e.code !== "Escape") return;
    if (e.defaultPrevented) return;

    const top = getTopEnabled();
    if (!top) return;

    top.handler();

    // Ensure ONLY the topmost handler runs.
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  };

  const ensureListener = () => {
    if (listening) return;
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", onKeyDown, true); // capture
    listening = true;
  };

  const register = (handler: EscHandler): string => {
    ensureListener();
    const id = `esc_${Math.random().toString(36).slice(2)}`;
    entries.set(id, {
      id,
      enabled: false,
      order: ++orderCounter, // registering counts as “recent”
      handler,
    });
    return id;
  };

  const unregister = (id: string) => {
    entries.delete(id);
  };

  const setEnabled = (id: string, enabled: boolean) => {
    const entry = entries.get(id);
    if (!entry) return;

    const wasEnabled = entry.enabled;
    entry.enabled = enabled;

    // enabling counts as “recent”
    if (!wasEnabled && enabled) entry.order = ++orderCounter;
  };

  const activate = (id: string) => {
    const entry = entries.get(id);
    if (!entry) return;
    entry.order = ++orderCounter;
  };

  const setHandler = (id: string, handler: EscHandler) => {
    const entry = entries.get(id);
    if (!entry) return;
    entry.handler = handler;
  };

  return { register, unregister, setEnabled, activate, setHandler };
}

function installUseGlobalEsc(core: EscCore): UseGlobalEsc {
  function useGlobalEsc(enabled: boolean, handler: EscHandler) {
    const idRef = useRef<string | null>(null);
    const handlerRef = useRef<EscHandler>(handler);

    // keep latest handler without re-registering
    useEffect(() => {
      handlerRef.current = handler;
    }, [handler]);

    // register once
    useEffect(() => {
      const wrapper = () => handlerRef.current();
      const id = core.register(wrapper);
      idRef.current = id;

      return () => {
        core.unregister(id);
        idRef.current = null;
      };
      // core is stable (window singleton)
    }, []);

    // enable/disable on state (enabling bumps recency + activate guarantees top)
    useEffect(() => {
      const id = idRef.current;
      if (!id) return;

      core.setEnabled(id, enabled);
      if (enabled) core.activate(id);
    }, [enabled]);
  }

  return useGlobalEsc;
}

/**
 * Side-effect init: installs window.__ESC__ and window.useGlobalEsc once.
 */
export function initGlobalEsc() {
  if (typeof window === "undefined") return;

  if (!window.__ESC__) {
    window.__ESC__ = createEscController();
  }

  // Always define (idempotent) so components can call it with zero checks.
  if (!window.useGlobalEsc) {
    window.useGlobalEsc = installUseGlobalEsc(window.__ESC__);
  }
}

// Initialize immediately on import
initGlobalEsc();

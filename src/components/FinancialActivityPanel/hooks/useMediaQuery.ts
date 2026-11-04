import { useEffect, useState } from "react";

/**
 * SSR-safe media query hook.
 * Supports legacy Safari addListener/removeListener and modern addEventListener.
 */
export function useMediaQuery(query: string) {
  type MediaQueryListCompat = MediaQueryList & {
    addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
    removeListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
  };

  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query) as MediaQueryListCompat;
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    setMatches(mql.matches);

    if (typeof mql.addEventListener === "function") {
      const handler: EventListener = (evt) => onChange(evt as MediaQueryListEvent);
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }

    if (typeof mql.addListener === "function") {
      mql.addListener(onChange);
      return () => mql.removeListener?.(onChange);
    }

    return;
  }, [query]);

  return matches;
}

import { useEffect, useRef } from "react";

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
  onOutside: () => void,
  enabled = true
) {
  const handlerRef = useLatestRef(onOutside);

  useEffect(() => {
    if (!enabled) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) handlerRef.current();
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [enabled, ref, handlerRef]);
}

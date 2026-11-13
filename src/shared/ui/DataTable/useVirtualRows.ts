import { useEffect, useMemo, useState, type RefObject } from "react";
import { buildRowOffsets, virtualRowRange } from "./virtualRows";

export function useVirtualRows(ref: RefObject<HTMLElement>, heights: number[], enabled: boolean, resetKey: string, overscan = 8) {
  const [top, setTop] = useState(0);
  const [viewport, setViewport] = useState(600);
  const offsets = useMemo(() => buildRowOffsets(heights), [heights]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setViewport(node.clientHeight);
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
    setTop(0);
  }, [ref, resetKey]);

  return {
    ...virtualRowRange(offsets, top, viewport, enabled, overscan),
    onScroll: () => setTop(ref.current?.scrollTop || 0),
  };
}

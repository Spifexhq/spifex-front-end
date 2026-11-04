import { useEffect, useState, type RefObject } from "react";
export function useVirtualRows(ref: RefObject<HTMLElement>, count: number, height: number, enabled: boolean, resetKey: string) {
    const [top, setTop] = useState(0), [viewport, setViewport] = useState(600);
    useEffect(() => { const node = ref.current; if (!node)
        return; const update = () => setViewport(node.clientHeight); const observer = new ResizeObserver(update); observer.observe(node); update(); return () => observer.disconnect(); }, [ref]);
    useEffect(() => { if (ref.current)
        ref.current.scrollTop = 0; setTop(0); }, [ref, resetKey]);
    const start = enabled ? Math.max(0, Math.min(Math.floor(top / height) - 8, count - 1)) : 0;
    const end = enabled ? Math.min(count, start + Math.ceil(viewport / height) + 16) : count;
    return { start, end, before: start * height, after: (count - end) * height, onScroll: () => setTop(ref.current?.scrollTop || 0) };
}

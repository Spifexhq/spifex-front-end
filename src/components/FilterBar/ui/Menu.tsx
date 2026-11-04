import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Popover } from "./Popover";
export type MenuActionItem = { key: string; label: ReactNode; onAction?: () => void };
export type MenuSeparator = { sep: true };
export type MenuEntry = MenuActionItem | MenuSeparator;

export function Menu({ roleLabel, items, onClose, onAfterAction, emptyLabel, anchorRef, align = "left" }: {
  roleLabel: string; items: MenuEntry[]; onClose(): void; onAfterAction?(): void;
  emptyLabel?: string; align?: "left" | "right"; anchorRef: RefObject<HTMLElement>;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [active, setActive] = useState(() => items.findIndex(item => !("sep" in item)));
  useEffect(() => { const frame = requestAnimationFrame(() => refs.current[active]?.focus()); return () => cancelAnimationFrame(frame); }, [active]);
  return <Popover anchorRef={anchorRef} align={align} onClose={onClose} className="w-56" role="menu" ariaLabel={roleLabel}>
    <div aria-label={roleLabel} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); anchorRef.current?.querySelector("button")?.focus(); }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const indices = items.flatMap((item, index) => "sep" in item ? [] : [index]);
      const next = event.key === "Home" ? indices[0] : event.key === "End" ? indices.at(-1) : indices[(indices.indexOf(active) + (event.key === "ArrowDown" ? 1 : -1) + indices.length) % indices.length];
      if (next !== undefined) setActive(next);
    }}>
      {!items.length && <p className="px-2 py-3 text-xs text-gray-500">{emptyLabel}</p>}
      {items.map((item, index) => "sep" in item ? <div role="separator" key={`separator-${index}`} className="my-1 h-px bg-gray-100" /> :
        <button key={item.key} ref={element => { refs.current[index] = element; }} type="button" role="menuitem" tabIndex={active === index ? 0 : -1}
          className="flex w-full items-center rounded-md px-2 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 focus:outline-none"
          onClick={() => { onClose(); item.onAction?.(); onAfterAction?.(); }}>{item.label}</button>)}
    </div>
  </Popover>;
}

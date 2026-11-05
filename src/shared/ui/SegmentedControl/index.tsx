import { useId, useRef, type ReactNode } from "react";

type Item<T extends string> = { value: T; label: ReactNode; disabled?: boolean; panelId?: string };

/** The same quiet inset selection style used by FloatingDialog's entry tabs. */
export default function SegmentedControl<T extends string>({
  value, items, onChange, label, id, tabs = false, stretch = false, disabled = false,
}: {
  value: T; items: Item<T>[]; onChange(value: T): void; label: string; id?: string;
  tabs?: boolean; stretch?: boolean; disabled?: boolean;
}) {
  const generated = useId();
  const baseId = id || `segments-${generated.replace(/:/g, "")}`;
  const buttons = useRef(new Map<T, HTMLButtonElement>());
  const enabled = items.filter(item => !item.disabled);
  return <div role={tabs ? "tablist" : "group"} aria-label={label}
    className={`${stretch ? "flex" : "inline-flex"} max-w-full gap-[3px] overflow-x-auto rounded-lg border border-[#e8ebf0] bg-[#f5f7fa] p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
    {items.map(item => <button key={item.value} id={`${baseId}-${item.value}`} type="button"
      ref={node => { if (node) buttons.current.set(item.value, node); else buttons.current.delete(item.value); }}
      role={tabs ? "tab" : undefined} aria-selected={tabs ? value === item.value : undefined}
      aria-pressed={!tabs ? value === item.value : undefined} aria-controls={item.panelId}
      tabIndex={value === item.value ? 0 : -1} disabled={disabled || item.disabled}
      onClick={() => onChange(item.value)}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || !enabled.length) return;
        event.preventDefault();
        const index = enabled.findIndex(option => option.value === item.value);
        const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length-1 : (index+(event.key === "ArrowRight" ? 1 : -1)+enabled.length)%enabled.length;
        onChange(enabled[next].value);
        buttons.current.get(enabled[next].value)?.focus();
      }}
      className={`${stretch ? "flex-1" : ""} min-h-11 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 py-2 text-xs font-medium text-[#687385] transition-colors hover:bg-[#edf0f5] hover:text-[#26344a] aria-selected:border-[#e1e6ee] aria-selected:bg-white aria-selected:text-[#26344a] aria-pressed:border-[#e1e6ee] aria-pressed:bg-white aria-pressed:text-[#26344a] focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50 sm:min-h-8`}>
      {item.label}
    </button>)}
  </div>;
}

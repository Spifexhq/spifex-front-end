import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MenuActionItem = { key: string; label: React.ReactNode; onAction?: () => void };
export type MenuSeparator = { sep: true };
export type MenuEntry = MenuActionItem | MenuSeparator;

const CLOSE_MS = 150;

function isActionItem(x: MenuEntry): x is MenuActionItem {
  return !("sep" in x);
}

const MenuItemBtn = React.forwardRef<
  HTMLButtonElement,
  { label: React.ReactNode; onClick(): void; active?: boolean; danger?: boolean }
>(({ label, onClick, active, danger }, ref) => (
  <button
    ref={ref}
    className={`w-full text-left px-3 py-2 rounded-md text-sm
      ${
        danger
          ? "text-red-600 hover:bg-rose-50 focus-visible:ring-rose-200"
          : "text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-300"
      }
      focus:outline-none focus-visible:ring-2 ${active ? "bg-gray-50" : ""}`}
    onClick={onClick}
    type="button"
  >
    {label}
  </button>
));
MenuItemBtn.displayName = "MenuItemBtn";

export const Menu: React.FC<{
  roleLabel: string;
  items: MenuEntry[];
  onClose: () => void;
  onAfterAction?: () => void;
  emptyLabel?: string;
  align?: "left" | "right";
}> = ({ roleLabel, items, onClose, onAfterAction, emptyLabel, align = "left" }) => {
  const aligned = align === "right" ? "right-0" : "left-0";
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // Local mount/open state to enable enter/exit transitions.
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const openRafRef = useRef<number | null>(null);

  useEffect(() => {
    // Animate in on mount (next frame) so CSS transitions can interpolate.
    openRafRef.current = window.requestAnimationFrame(() => setIsOpen(true));

    return () => {
      if (openRafRef.current != null) window.cancelAnimationFrame(openRafRef.current);
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const closeWithAnimation = useCallback(
    (after?: () => void) => {
      setIsOpen(false);
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);

      closeTimerRef.current = window.setTimeout(() => {
        onClose();
        after?.();
      }, CLOSE_MS);
    },
    [onClose]
  );

  const actionableIndexes = useMemo(
    () => items.map((it, i) => (isActionItem(it) ? i : -1)).filter((i) => i >= 0),
    [items]
  );

  const [activeIndex, setActiveIndex] = useState<number>(() => actionableIndexes[0] ?? 0);

  useEffect(() => {
    refs.current[activeIndex]?.focus();
  }, [activeIndex]);

  const focusNext = useCallback(
    (dir: 1 | -1) => {
      if (!actionableIndexes.length) return;
      const curr = actionableIndexes.indexOf(activeIndex);
      const base = curr === -1 ? (dir === 1 ? -1 : 1) : curr;
      const next = actionableIndexes[(base + dir + actionableIndexes.length) % actionableIndexes.length];
      setActiveIndex(next);
    },
    [actionableIndexes, activeIndex]
  );

  window.useGlobalEsc(isOpen, () => closeWithAnimation());

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusNext(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusNext(-1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item && isActionItem(item)) {
        closeWithAnimation(() => {
          item.onAction?.();
          onAfterAction?.();
        });
      }
    }
  };

  return (
    <div
      role="menu"
      aria-label={roleLabel}
      onKeyDown={onKeyDown}
      className={[
        `mt-1 absolute ${aligned} top-full z-[60] w-72 sm:w-72 max-w-[calc(100vw-1rem)]`,
        "rounded-md border border-gray-300 bg-white p-2 shadow-lg max-h-[60vh] overflow-y-auto",
        "origin-top",
        "transition-all duration-150 ease-out",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-1 pointer-events-none",
      ].join(" ")}
      data-menu-open={isOpen ? "true" : "false"}
    >
      {items.length === 0 && emptyLabel ? (
        <div className="text-xs text-gray-500 px-2 py-1">{emptyLabel}</div>
      ) : (
        items.map((it, i) =>
          "sep" in it ? (
            <div key={`sep-${i}`} className="my-1 h-px bg-gray-200" />
          ) : (
            <MenuItemBtn
              key={it.key}
              label={it.label}
              active={activeIndex === i}
              onClick={() => {
                closeWithAnimation(() => {
                  it.onAction?.();
                  onAfterAction?.();
                });
              }}
              ref={(el) => {
                refs.current[i] = el;
              }}
            />
          )
        )
      )}
    </div>
  );
};
